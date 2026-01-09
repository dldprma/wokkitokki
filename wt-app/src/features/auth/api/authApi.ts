import api from "../../../utils/axios";
import type { AuthResponse, LoginData, RegisterData } from "../types/authTypes";

export const checkUsernameDuplicate = async (
  username: string
): Promise<{ exists: boolean }> => {
  const response = await api.get(`/api/auth/check-username/${username}`);
  return response.data;
};

// email 중복 검사
export const checkEmailDuplicate = async (
  email: string
): Promise<{ exists: boolean }> => {
  const response = await api.get(`/api/auth/check-email/${email}`);
  return response.data;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post("/api/auth/register", data);
  return response.data;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post("/api/auth/login", data, {
    withCredentials: true,
  });
  return response.data;
};

export const logout = async (): Promise<void> => {
  const response = await api.post(
    "/api/auth/logout",
    {},
    {
      withCredentials: true,
    }
  );
};

export const refreshToken = async (): Promise<AuthResponse> => {
  const response = await api.post(
    "/api/auth/refresh",
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
};
