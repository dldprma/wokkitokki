import axios from "axios";

let accessToken: string | null = null;

const api = axios.create({
  baseURL: "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      // 토큰만 클리어하고 자동 리다이렉트는 비활성화
      clearAccessToken();
    }

    return Promise.reject(error);
  }
);

export const settingAccessToken = (token: string) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export default api;
