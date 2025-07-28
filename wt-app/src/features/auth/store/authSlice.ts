import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  checkUsernameDuplicate,
  login,
  logout,
  refreshToken,
  register,
} from "../api/authApi";
import type { AuthState, LoginData, RegisterData } from "../types/authTypes";

// 초기상태
const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem("accessToken"),
  isAuthenticated: !!localStorage.getItem("accessToken"),
  loading: false,
  error: null,
};

// username 중복체크
export const checkUsername = createAsyncThunk(
  "auth/checkUsername",
  async (username: string, { rejectWithValue }) => {
    try {
      const response = await checkUsernameDuplicate(username);
      return response;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "사용자명 확인에 실패했습니다."
      );
    }
  }
);

// 회원가입
export const registerUser = createAsyncThunk(
  "auth/register",
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const res = await register(data);
      return res;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data.message || "회원가입에 실패했습니다."
      );
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (data: LoginData, { rejectWithValue }) => {
    try {
      const res = await login(data);
      localStorage.setItem("accessToken", res.accessToken);
      localStorage.setItem("user", JSON.stringify(res.user));
      return res;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "로그인에 실패했습니다."
      );
    }
  }
);

// 로그아웃
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await logout();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      return null;
    } catch (err: any) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      return rejectWithValue(
        err.response?.data?.message || "로그아웃에 실패했습니다."
      );
    }
  }
);

// 토큰 갱신
export const refreshUserToken = createAsyncThunk(
  "auth/refresh",
  async (_, { rejectWithValue }) => {
    try {
      const response = await refreshToken();
      localStorage.setItem("accessToken", response.accessToken);
      return response;
    } catch (err: any) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      return rejectWithValue("토큰이 만료되었습니다. 다시 로그인해주세요.");
    }
  }
);

// Auth Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // 로딩상태 설정
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // 에러상태 설정
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // 에러 초기화
    clearError: (state) => {
      state.error = null;
    },
    // 초기화 (앱 시작 시 localStorage에서 사용자 정보 복원)
    initializeAuth: (state) => {
      const storedUser = localStorage.getItem("user");
      if (storedUser && state.accessToken) {
        state.user = JSON.parse(storedUser);
        state.isAuthenticated = true;
      }
    },
  },
  extraReducers: (builder) => {
    // 회원가입
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // 로그인
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // 로그아웃
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      });

    // 토큰 갱신
    builder
      .addCase(refreshUserToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshUserToken.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.error = null;
      })
      .addCase(refreshUserToken.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });
  },
});

export const { setLoading, setError, clearError, initializeAuth } =
  authSlice.actions;
export default authSlice.reducer;
