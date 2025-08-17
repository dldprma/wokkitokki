import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/store/authSlice";
import homeReducer from "../features/home/store/homeSlice";
import userReducer from "../features/user/store/userSlice";
import postReducer from "../features/post/store/postSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    home: homeReducer,
    user: userReducer,
    post: postReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
