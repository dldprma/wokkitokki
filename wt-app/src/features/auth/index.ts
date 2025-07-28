export { default as RegisterForm } from "./components/RegisterForm";
export { default as LoginForm } from "./components/LoginForm";
export { useAuth } from "./hooks/useAuth";
import authReducer from "./store/authSlice";
export { authReducer };

export type {
  RegisterData,
  LoginData,
  User,
  AuthResponse,
} from "./types/authTypes";
