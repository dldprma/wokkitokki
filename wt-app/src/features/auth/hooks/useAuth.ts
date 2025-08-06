import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  checkUsername,
  loginUser,
  logoutUser,
  registerUser,
} from "../store/authSlice";
import type { LoginData, RegisterData } from "../types/authTypes";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  const register = async (data: RegisterData) => {
    return await dispatch(registerUser(data));
  };

  const login = async (data: LoginData) => {
    return await dispatch(loginUser(data));
  };

  const logout = async () => {
    return await dispatch(logoutUser());
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
