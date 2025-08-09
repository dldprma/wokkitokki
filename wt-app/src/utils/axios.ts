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
    const originalRequest = error.config;
    const status = error.response?.status;

    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      // localStorage에 사용자 정보가 있을 때만 토큰 갱신 시도
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const response = await axios.post(
            "http://localhost:8080/api/auth/refresh",
            {},
            { withCredentials: true }
          );
          const { accessToken: newAccessToken } = response.data;
          settingAccessToken(newAccessToken);

          // 원래 요청에 새 토큰 적용
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // 토큰 갱신 실패 시 로그아웃
          clearAccessToken();
          localStorage.removeItem("user");

          if (
            window.location.pathname !== "/login" &&
            window.location.pathname !== "/register"
          ) {
            window.location.href = "/login";
          }
        }
      } else {
        // 사용자 정보가 없으면 바로 로그인 페이지로
        clearAccessToken();
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register"
        ) {
          window.location.href = "/login";
        }
      }
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
