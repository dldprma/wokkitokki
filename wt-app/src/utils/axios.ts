import axios from "axios";

let accessToken: string | null = null;

const api = axios.create({
  baseURL: "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
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

// 응답 인터셉터: 401/403에서 토큰 갱신 후 재시도
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: any = error.config;
    const status = error.response?.status;

    if ((status === 401 || status === 403) && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const res = await api.post(
          "/api/auth/refresh",
          {},
          { withCredentials: true }
        );
        const { accessToken: newAccessToken } = res.data;
        settingAccessToken(newAccessToken);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (e) {
        clearAccessToken();
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(e);
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
