import axios from "axios";
import type { AuthResponse, LoginData, RegisterData } from "../types/authTypes";

export const checkUsernameDuplicate = async (
  username: string
): Promise<{ exists: boolean }> => {
  const response = await axios.post("/api/user/check-username", { username });
  return response.data;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await axios.post("/api/register", data);
  return response.data;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await axios.post("/api/login", data, {
    withCredentials: true,
  });
  return response.data;
};

export const logout = async (): Promise<void> => {
  const response = await axios.post(
    "/api/logout",
    {},
    {
      withCredentials: true,
    }
  );
};

export const refreshToken = async (): Promise<AuthResponse> => {
  const response = await axios.post(
    "/api/refresh",
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
};
