import React, { useState } from "react";
import "../../../css/Form.css";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { loginUser, clearError } from "../store/authSlice";
import { useNavigate } from "react-router-dom";

const LoginForm = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    const result = await dispatch(loginUser(formData));

    if (loginUser.fulfilled.match(result)) {
      navigate("/");
    }
  };

  return (
    <div className="wrapper">
      <div className="formBox login-form">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.png"
            alt="logo"
            className="w-40 sm:w-48 md:w-64 h-auto"
          />
          <h1 className="title">로그인</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="inputField"
              required
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="inputField"
              required
            />
          </div>

          {error && <p className="errorMsg">{error}</p>}

          <button type="submit" className="submitButton" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
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
