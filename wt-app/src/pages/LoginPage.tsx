import React from "react";
import { LoginForm } from "../features/auth";
import FallingEmojiBackground from "../utils/FallingEmojiBackground";

const LoginPage = () => {
  return (
    <>
      <FallingEmojiBackground />
      <LoginForm />
    </>
  );
};

export default LoginPage;
