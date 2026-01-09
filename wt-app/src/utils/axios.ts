import axios from "axios";

// Redux store 인스턴스를 저장할 변수
let store: any = null;

// Redux store 설정 함수 (App.tsx에서 호출)
export const setStore = (reduxStore: any) => {
  store = reduxStore;
};

// token getter: Redux store에서 항상 최신값을 가져오기
const getAccessToken = (): string | null => {
  if (store) {
    const state = store.getState();
    return state?.auth?.accessToken || null;
  }
  // fallback: localStorage에서 가져오기
  try {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    return userData.accessToken || null;
  } catch {
    return null;
  }
};

const isPublic = (url?: string) =>
  !!url && (/^\/auth\/(login|refresh)/.test(url) || /^\/public\//.test(url));

const api = axios.create({
  baseURL: "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    if (!isPublic(config.url)) {
      const token = getAccessToken();
      if (token) {
        // headers 안전 병합
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        } as any;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 401/403 구분 처리
let isRefreshing = false;
let pendingQueue: Array<[(v?: any) => void, (e: any) => void]> = [];

const processQueue = (error: any, token?: string) => {
  pendingQueue.forEach(([resolve, reject]) =>
    error ? reject(error) : resolve(token)
  );
  pendingQueue = [];
};

// 토큰 갱신 함수
const refreshAccessToken = async (): Promise<string> => {
  try {
    const response = await axios.post(
      "http://localhost:8080/api/auth/refresh",
      {},
      { withCredentials: true }
    );
    return response.data.accessToken;
  } catch (error) {
    throw new Error("토큰 갱신 실패");
  }
};

// 토큰 클리어 함수 (내부용)
const clearAccessTokenInternal = () => {
  // Redux store에서 토큰 제거 (dispatch 필요)
  // 여기서는 간단히 localStorage만 클리어
  localStorage.removeItem("user");
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const status = response?.status;

    // 401: 토큰 만료 → refresh 시도 (중복 요청 큐잉)
    if (status === 401 && !config._retry && !isPublic(config.url)) {
      config._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push([resolve, reject]);
        }).then((newToken) => {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          } as any;
          return api(config);
        });
      }

      try {
        isRefreshing = true;
        const newToken = await refreshAccessToken();

        // Redux store에 새 토큰 저장 (dispatch 필요)
        // 여기서는 간단히 localStorage에 저장
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        userData.accessToken = newToken;
        localStorage.setItem("user", JSON.stringify(userData));

        processQueue(null, newToken);

        // 원 요청 재시도
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        } as any;
        return api(config);
      } catch (e) {
        processQueue(e);
        // 리프레시 실패 → 완전 로그아웃
        clearAccessTokenInternal();
        // 필요시 리다이렉트
        throw e;
      } finally {
        isRefreshing = false;
      }
    }

    // 403: 권한 문제 → 로그아웃 X, 화면에서 접근권한 안내
    if (status === 403) {
      // 여긴 토큰 클리어 대신 권한 부족 안내 토스트/페이지 전환 등
      console.warn("접근 권한이 없습니다.");
    }

    return Promise.reject(error);
  }
);

export const settingAccessToken = (token: string) => {
  // Redux store에 토큰 저장 (dispatch 필요)
  // 여기서는 간단히 localStorage에 저장
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  userData.accessToken = token;
  localStorage.setItem("user", JSON.stringify(userData));
};

export const clearAccessToken = () => {
  // Redux store에서 토큰 제거 (dispatch 필요)
  // 여기서는 간단히 localStorage만 클리어
  localStorage.removeItem("user");
};

export default api;
