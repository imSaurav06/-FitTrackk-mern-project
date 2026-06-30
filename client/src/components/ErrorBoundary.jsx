import React from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  text-align: center;
  background: #f7f9fc;
  color: #333;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #ef5350;
  margin-bottom: 10px;
`;

const Message = styled.p`
  font-size: 1.1rem;
  color: #555;
  margin-bottom: 20px;
  max-width: 500px;
`;

const Button = styled.button`
  background: #007aff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 122, 255, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: #0063cc;
    transform: translateY(-1px);
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container>
          <Title>Oops! Something went wrong.</Title>
          <Message>
            We ran into an unexpected client-side error. Please reload the page or click below to return to safety.
          </Message>
          <Button onClick={() => window.location.href = "/"}>
            Go to Home
          </Button>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
