import React from "react";
import "../../../css/Form.css";

const RegisterForm = () => {
  return (
    <>
      <div className="wrapper">
        <div className="formBox">
          <div className="flex flex-col items-center mb-6">
            <div>
              <img
                src="../../public/logo.png"
                alt="logo"
                className="w-64 h-auto"
              />
            </div>
            <h1 className="title">Wokki Tokki</h1>
          </div>
          <form className="space-y-4">
            <input type="email" placeholder="E-mail" className="inputField" />
            <input
              type="password"
              placeholder="Password"
              className="inputField"
            />
            <input type="text" placeholder="Full Name" className="inputField" />
            <input type="text" placeholder="Username" className="inputField" />
            <button type="submit" className="submitButton">
              회원가입
            </button>
          </form>

          <p className="loginText">
            이미 계정이 있나요?{" "}
            <a href="/login" className="loginLink">
              로그인하기
            </a>
          </p>
        </div>

        <p className="footer">
          <span className="font-medium">Wokki Tokki</span>로 새로운 소셜 경험을
          시작하세요. 📡
        </p>
      </div>
    </>
  );
};

export default RegisterForm;
