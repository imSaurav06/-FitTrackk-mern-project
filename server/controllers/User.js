import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createError } from "../error.js";
import User from "../models/User.js";
import Workout from "../models/Workout.js";

dotenv.config();

export const UserRegister = async (req, res, next) => {
  try {
    const { email, password, name, img } = req.body;

    // Check if the email is in use
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return next(createError(409, "Email is already in use."));
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      img,
    });
    const createdUser = await user.save();
    const token = jwt.sign({ id: createdUser._id }, process.env.JWT, {
      expiresIn: "9999 years",
    });
    return res.status(200).json({ token, user });
  } catch (error) {
    return next(error);
  }
};

export const UserLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });
    // Check if user exists
    if (!user) {
      return next(createError(404, "User not found"));
    }
    console.log(user);
    // Check if password is correct
    const isPasswordCorrect = await bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
      return next(createError(403, "Incorrect password"));
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT, {
      expiresIn: "9999 years",
    });

    return res.status(200).json({ token, user });
  } catch (error) {
    return next(error);
  }
};

export const getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    const currentDateFormatted = new Date();
    const startToday = new Date(
      currentDateFormatted.getFullYear(),
      currentDateFormatted.getMonth(),
      currentDateFormatted.getDate()
    );
    const endToday = new Date(
      currentDateFormatted.getFullYear(),
      currentDateFormatted.getMonth(),
      currentDateFormatted.getDate() + 1
    );

    //calculte total calories burnt
    const totalCaloriesBurnt = await Workout.aggregate([
      { $match: { user: user._id, date: { $gte: startToday, $lt: endToday } } },
      {
        $group: {
          _id: null,
          totalCaloriesBurnt: { $sum: "$caloriesBurned" },
        },
      },
    ]);

    //Calculate total no of workouts
    const totalWorkouts = await Workout.countDocuments({
      user: userId,
      date: { $gte: startToday, $lt: endToday },
    });

    //Calculate average calories burnt per workout
    const avgCaloriesBurntPerWorkout =
      totalCaloriesBurnt.length > 0
        ? totalCaloriesBurnt[0].totalCaloriesBurnt / totalWorkouts
        : 0;

    // Fetch category of workouts
    const categoryCalories = await Workout.aggregate([
      { $match: { user: user._id, date: { $gte: startToday, $lt: endToday } } },
      {
        $group: {
          _id: "$category",
          totalCaloriesBurnt: { $sum: "$caloriesBurned" },
        },
      },
    ]);

    //Format category data for pie chart

    const pieChartData = categoryCalories.map((category, index) => ({
      id: index,
      value: category.totalCaloriesBurnt,
      label: category._id,
    }));

    const weeks = [];
    const caloriesBurnt = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(
        currentDateFormatted.getTime() - i * 24 * 60 * 60 * 1000
      );
      weeks.push(`${date.getDate()}th`);

      const startOfDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      const endOfDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1
      );

      const weekData = await Workout.aggregate([
        {
          $match: {
            user: user._id,
            date: { $gte: startOfDay, $lt: endOfDay },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            totalCaloriesBurnt: { $sum: "$caloriesBurned" },
          },
        },
        {
          $sort: { _id: 1 }, // Sort by date in ascending order
        },
      ]);

      caloriesBurnt.push(
        weekData[0]?.totalCaloriesBurnt ? weekData[0]?.totalCaloriesBurnt : 0
      );
    }

    return res.status(200).json({
      totalCaloriesBurnt:
        totalCaloriesBurnt.length > 0
          ? totalCaloriesBurnt[0].totalCaloriesBurnt
          : 0,
      totalWorkouts: totalWorkouts,
      avgCaloriesBurntPerWorkout: avgCaloriesBurntPerWorkout,
      totalWeeksCaloriesBurnt: {
        weeks: weeks,
        caloriesBurned: caloriesBurnt,
      },
      pieChartData: pieChartData,
    });
  } catch (err) {
    next(err);
  }
};

export const getWorkoutsByDate = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    let date = req.query.date ? new Date(req.query.date) : new Date();
    if (!user) {
      return next(createError(404, "User not found"));
    }
    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1
    );

    const todaysWorkouts = await Workout.find({
      user: userId,
      date: { $gte: startOfDay, $lt: endOfDay },
    });
    const totalCaloriesBurnt = todaysWorkouts.reduce(
      (total, workout) => total + workout.caloriesBurned,
      0
    );

    return res.status(200).json({ todaysWorkouts, totalCaloriesBurnt });
  } catch (err) {
    next(err);
  }
};

export const addWorkout = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { workoutString } = req.body;
    if (!workoutString) {
      return next(createError(400, "Workout string is missing"));
    }

    // Split workoutString into individual workouts, ignoring trailing/empty ones
    const eachworkout = workoutString
      .split(";")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    if (eachworkout.length === 0) {
      return next(createError(400, "No workouts found in the input string."));
    }

    const parsedWorkouts = [];
    let count = 0;

    for (const line of eachworkout) {
      count++;
      if (line.startsWith("#")) {
        // Filter out empty parts in case there are multiple empty lines
        const parts = line.split("\n").map((part) => part.trim()).filter((part) => part !== "");
        if (parts.length < 5) {
          return next(
            createError(400, `Workout details are incomplete for workout ${count}. It must contain 5 lines.`)
          );
        }

        const currentCategory = parts[0].substring(1).trim();
        const workoutDetails = parseWorkoutLine(parts);
        if (workoutDetails == null) {
          return next(
            createError(
              400,
              `Workout ${count} has an invalid format. Please follow the placeholder pattern:
              #Category
              - Workout Name
              - X sets X reps
              - X kg
              - X min`
            )
          );
        }

        workoutDetails.category = currentCategory;
        parsedWorkouts.push(workoutDetails);
      } else {
        return next(
          createError(400, `Workout string is missing starting '#' for category in workout ${count}`)
        );
      }
    }

    const createdWorkouts = [];
    for (const workout of parsedWorkouts) {
      workout.caloriesBurned = parseFloat(calculateCaloriesBurnt(workout));
      const newWorkout = await Workout.create({ ...workout, user: userId });
      createdWorkouts.push(newWorkout);
    }

    return res.status(201).json({
      message: "Workouts added successfully",
      workouts: createdWorkouts,
    });
  } catch (err) {
    next(err);
  }
};

// Function to parse workout details from a line using robust regex
const parseWorkoutLine = (parts) => {
  const details = {};
  if (parts.length >= 5) {
    // parts[1]: name (e.g. "- Back Squat" or "-Back Squat")
    details.workoutName = parts[1].replace(/^-\s*/, "").trim();

    // parts[2]: sets and reps (e.g. "- 5 setsX15 reps" or "- 5 sets x 15 reps" or "-5 sets 15 reps")
    const setsRepsMatch = parts[2].match(/(\d+)\s*sets?\s*(?:x|X)?\s*(\d+)\s*reps?/i);
    if (!setsRepsMatch) return null;
    details.sets = parseInt(setsRepsMatch[1], 10);
    details.reps = parseInt(setsRepsMatch[2], 10);

    // parts[3]: weight (e.g. "- 30 kg" or "-30kg")
    const weightMatch = parts[3].match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (!weightMatch) return null;
    details.weight = parseFloat(weightMatch[1]);

    // parts[4]: duration (e.g. "- 10 min" or "-10mins")
    const durationMatch = parts[4].match(/(\d+(?:\.\d+)?)\s*min/i);
    if (!durationMatch) return null;
    details.duration = parseFloat(durationMatch[1]);

    return details;
  }
  return null;
};

// Function to calculate calories burnt for a workout
const calculateCaloriesBurnt = (workoutDetails) => {
  const durationInMinutes = parseFloat(workoutDetails.duration);
  const weightInKg = parseFloat(workoutDetails.weight);
  const caloriesBurntPerMinute = 5; // Sample calculation rate
  // If weight is 0, give a default calorie burn based on duration
  const weightFactor = weightInKg > 0 ? weightInKg : 60; // default to 60kg factor
  return durationInMinutes * caloriesBurntPerMinute * (weightFactor / 60);
};
