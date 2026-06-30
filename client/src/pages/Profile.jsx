import React, { useState } from "react";
import styled from "styled-components";
import { useSelector, useDispatch } from "react-redux";
import { updateProfile } from "../api";
import { updateProfileSuccess } from "../redux/reducers/userSlice";
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import { Avatar, Snackbar, Alert } from "@mui/material";

const Container = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 22px 0px;
  overflow-y: scroll;
`;

const Card = styled.div`
  width: 100%;
  max-width: 500px;
  background: ${({ theme }) => theme.card || "#FFFFFF"};
  border: 1px solid ${({ theme }) => theme.text_primary + 20};
  border-radius: 14px;
  box-shadow: 1px 6px 20px 0px ${({ theme }) => theme.primary + 15};
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin: 20px;
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.text_primary};
  margin-bottom: 10px;
`;

const Form = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InfoText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.text_secondary};
  text-align: center;
`;

const Profile = () => {
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [name, setName] = useState(currentUser?.name || "");
  const [age, setAge] = useState(currentUser?.age || "");
  const [img, setImg] = useState(currentUser?.img || "");
  const [loading, setLoading] = useState(false);

  // Snackbar Toast states
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  const handleUpdate = async () => {
    if (!name) {
      setToast({ open: true, message: "Name is required!", severity: "error" });
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("fittrack-app-token");
    try {
      const response = await updateProfile(token, { name, age: age ? parseInt(age, 10) : undefined, img });
      if (response.data.success) {
        dispatch(updateProfileSuccess({ user: response.data.user, token: response.data.token }));
        setToast({ open: true, message: "Profile updated successfully!", severity: "success" });
      }
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        message: err.response?.data?.message || "Failed to update profile",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Title>User Profile</Title>
        <Avatar
          src={img || currentUser?.img}
          sx={{ width: 100, height: 100, fontSize: "40px", bgcolor: "#007AFF" }}
        >
          {name ? name[0] : "U"}
        </Avatar>
        <InfoText>Email: {currentUser?.email}</InfoText>
        <Form>
          <TextInput
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            handelChange={(e) => setName(e.target.value)}
          />
          <TextInput
            label="Age"
            placeholder="Enter your age"
            value={age}
            handelChange={(e) => setAge(e.target.value)}
          />
          <TextInput
            label="Profile Image URL"
            placeholder="Enter avatar image URL"
            value={img}
            handelChange={(e) => setImg(e.target.value)}
          />
          <Button
            text="Save Profile"
            onClick={handleUpdate}
            isLoading={loading}
            isDisabled={loading}
          />
        </Form>
      </Card>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast}>
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Profile;
