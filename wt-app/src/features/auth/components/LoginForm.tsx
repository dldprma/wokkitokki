import React, { useState } from "react";
import "../../../css/Form.css";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { loginUser, clearError, setLoading } from "../store/authSlice";
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
    console.log("로그인 시도 시작:", formData.username);
    dispatch(clearError());

    try {
      // 타임아웃 설정 (10초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("로그인 요청 시간 초과")), 10000);
      });

      console.log("로그인 API 호출 시작");
      const result = await Promise.race([
        dispatch(loginUser(formData)),
        timeoutPromise,
      ]);

      console.log("로그인 결과:", result);
      if (loginUser.fulfilled.match(result)) {
        console.log("로그인 성공, 홈으로 이동");
        navigate("/");
      } else if (loginUser.rejected.match(result)) {
        console.log("로그인 실패:", result.error);
      }
    } catch (error) {
      console.error("로그인 에러:", error);
      // 에러가 발생하면 로딩 상태를 강제로 false로 설정
      dispatch(setLoading(false));
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
          <a href="/register" className="registerLink">
            회원가입
          </a>
        </p>
      </div>

      <p className="footer">Wokki Tokki에 오신 걸 환영합니다 📡</p>
    </div>
  );
};

export default LoginForm;
