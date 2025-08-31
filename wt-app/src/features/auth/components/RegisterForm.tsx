import React, { useEffect, useState } from "react";
import "../../../css/Form.css";
import * as yup from "yup";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import type { RegisterData } from "../types/authTypes";
import {
  checkUsername,
  checkEmail,
  clearError,
  registerUser,
  setError,
} from "../store/authSlice";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

const schema = yup.object().shape({
  email: yup
    .string()
    .email("올바른 이메일 형식이 아닙니다.")
    .required("이메일은 필수입니다."),
  password: yup
    .string()
    .matches(
      /^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
      "비밀번호는 소문자+숫자+특수문자를 포함해야 합니다."
    )
    .min(6, "비밀번호는 최소 6자 이상이어야 합니다.")
    .required("비밀번호는 필수입니다."),
  fullName: yup.string().required("이름을 입력해주세요."),
  username: yup
    .string()
    .matches(
      /^[a-z0-9_]+$/,
      "사용자 이름은 소문자 영어, 숫자, _만 사용 가능합니다."
    )
    .required("사용자 이름을 입력해주세요."),
});

const RegisterForm = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const watchedUsername = watch("username");
  const watchedEmail = watch("email");
  const watchedPassword = watch("password");

  // 비밀번호 실시간 검증
  useEffect(() => {
    if (watchedPassword && watchedPassword.length > 0) {
      trigger("password");
    }
  }, [watchedPassword, trigger]);

  // 사용자명 중복 확인
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (watchedUsername && watchedUsername.length >= 3) {
        const isValidFormat = /^[a-z0-9_]+$/.test(watchedUsername);
        if (!isValidFormat) {
          setUsernameExists(false);
          return;
        }

        setIsCheckingUsername(true);
        try {
          const result = await dispatch(checkUsername(watchedUsername));

          if (checkUsername.fulfilled.match(result)) {
            if (result.payload.exists) {
              setUsernameExists(true);
              setError("username", {
                message: "이미 사용 중인 사용자 이름입니다.",
              });
            } else {
              setUsernameExists(false);
            }
          }
        } catch (error) {
          console.error("사용자명 확인 실패", error);
        } finally {
          setIsCheckingUsername(false);
        }
      } else {
        setUsernameExists(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [watchedUsername, setError, dispatch]);

  // 이메일 중복 확인
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (watchedEmail && watchedEmail.includes("@")) {
        setIsCheckingEmail(true);
        try {
          const result = await dispatch(checkEmail(watchedEmail));

          if (checkEmail.fulfilled.match(result)) {
            if (result.payload.exists) {
              setEmailExists(true);
              setError("email", { message: "이미 사용중인 이메일입니다." });
            } else {
              setEmailExists(false);
            }
          }
        } catch (error) {
          console.error("이메일 확인 실패", error);
        } finally {
          setIsCheckingEmail(false);
        }
      } else {
        setEmailExists(false);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [watchedEmail, setError, dispatch]);

  const onSubmit = async (data: RegisterData) => {
    if (usernameExists) {
      setError("username", { message: "이미 사용 중인 사용자 이름입니다." });
      return;
    }

    if (emailExists) {
      setError("email", { message: "이미 사용 중인 이메일입니다." });
      return;
    }

    dispatch(clearError());
    const result = await dispatch(registerUser(data));

    if (registerUser.fulfilled.match(result)) {
      // 회원가입 성공 시 알림창 표시
      if (
        window.confirm(
          "회원가입이 완료되었습니다! 로그인 페이지로 이동하시겠습니까?"
        )
      ) {
        navigate("/login");
      }
    }
  };

  return (
    <>
      <div className="wrapper">
        <div className="formBox">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/logo.png"
              alt="logo"
              className="w-40 sm:w-48 md:w-64 h-auto"
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input
                {...register("email")}
                type="email"
                placeholder="E-mail"
                className="inputField"
              />
              {isCheckingEmail && (
                <p className="text-sm text-blue-500 ml-1 mt-1">
                  이메일 확인 중...
                </p>
              )}
              {errors.email && (
                <p className="errorMsg">{errors.email.message}</p>
              )}
            </div>

            <div>
              <input
                {...register("password")}
                type="password"
                placeholder="Password"
                className="inputField"
              />
              {errors.password && (
                <p className="errorMsg">{errors.password.message}</p>
              )}
            </div>

            <div>
              <input
                {...register("fullName")}
                type="text"
                placeholder="Full Name"
                className="inputField"
              />
              {errors.fullName && (
                <p className="errorMsg">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <input
                {...register("username")}
                type="text"
                placeholder="Username"
                className="inputField"
              />
              {isCheckingUsername && (
                <p className="text-sm text-blue-500 ml-1 mt-1">
                  사용자명 확인 중...
                </p>
              )}
              {usernameExists && !isCheckingUsername && (
                <p className="errorMsg">이미 사용 중인 사용자 이름입니다.</p>
              )}
              {errors.username && !usernameExists && (
                <p className="errorMsg">{errors.username.message}</p>
              )}
            </div>

            {error && <p className="errorMsg">{error}</p>}

            <button
              type="submit"
              className="submitButton"
              disabled={loading || usernameExists || emailExists}
            >
              {loading ? "처리 중..." : "회원가입"}
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
