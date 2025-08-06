import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  updateProfile,
  uploadProfileImage,
  getUserProfile,
} from "../api/userApi";
import type { UserState, UpdateProfileData } from "../types/userTypes";

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
};

// 사용자 프로필 조회
export const fetchUserProfile = createAsyncThunk(
  "user/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getUserProfile();
      return response;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "프로필 조회에 실패했습니다."
      );
    }
  }
);

// 프로필 업데이트
export const updateUserProfile = createAsyncThunk(
  "user/updateProfile",
  async (data: UpdateProfileData, { rejectWithValue }) => {
    try {
      const res = await updateProfile(data);

      // 로컬 스토리지의 사용자 정보 업데이트
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const updatedUser = { ...user, ...data };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      return res;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "프로필 업데이트에 실패했습니다."
      );
    }
  }
);

// 프로필 이미지 업로드
export const uploadUserProfileImage = createAsyncThunk(
  "user/uploadProfileImage",
  async (file: File, { rejectWithValue, dispatch }) => {
    try {
      const res = await uploadProfileImage(file);

      // 프로필 이미지 URL로 프로필 업데이트
      await dispatch(updateUserProfile({ profileImage: res.imageUrl }));

      return res;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "이미지 업로드에 실패했습니다."
      );
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    // 프로필 조회
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 프로필 업데이트
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 프로필 이미지 업로드
      .addCase(uploadUserProfileImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadUserProfileImage.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(uploadUserProfileImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setLoading, setError, clearError, setUser } = userSlice.actions;
export default userSlice.reducer;
