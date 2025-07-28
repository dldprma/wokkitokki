import React from "react";
import "../../../css/Form.css";

const LoginForm = () => {
  return (
    <div className="wrapper">
      <div className="formBox">
        <div className="flex flex-col items-center mb-6">
          <img src="../../public/logo.png" alt="logo" className="w-64 h-auto" />
          <h1 className="title">로그인</h1>
        </div>

        <form>
          <input type="text" className="inputField" placeholder="Username" />
          <input
            type="password"
            className="inputField"
            placeholder="Password"
          />
          <button className="submitButton">로그인</button>
        </form>

        <p className="loginText">
          계정이 없으신가요?{" "}
          <a href="/register" className="loginLink">
            회원가입
          </a>
        </p>
      </div>

      <p className="footer">Wokki Tokki에 오신 걸 환영합니다 📡</p>
    </div>
  );
};

export default LoginForm;
