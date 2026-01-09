import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { useNavigate } from "react-router-dom";
import {
  checkUsername,
  loginUser,
  logoutUser,
  registerUser,
} from "../store/authSlice";
import type { LoginData, RegisterData } from "../types/authTypes";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);

  const register = async (data: RegisterData) => {
    return await dispatch(registerUser(data));
  };

  const login = async (data: LoginData) => {
    return await dispatch(loginUser(data));
  };

  const logout = async () => {
    const result = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(result)) {
      // 로그아웃 성공 시 홈 페이지로 이동
      navigate("/");
    }
    return result;
  };

  const checkUsernameDuplicate = async (username: string) => {
    return await dispatch(checkUsername(username));
  };

  return {
    ...auth,
    register,
    login,
    logout,
    checkUsernameDuplicate,
  };
};
