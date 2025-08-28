import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { useEffect } from "react";
import {
  initializeAuth,
  refreshUserToken,
  setInitialized,
} from "./features/auth/store/authSlice";
import { setStore } from "./utils/axios";
import { store } from "./store/store";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import UserProfilePage from "./pages/UserProfilePage";
import PostDetailPage from "./pages/PostDetailPage";
import CommentDetailPage from "./pages/CommentDetailPage";

// axios에 Redux store 설정
setStore(store);

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isInitialized, loading } = useAppSelector(
    (state) => state.auth
  );

  // 인증이 초기화되지 않았거나 로딩 중이면 로딩 상태 유지
  if (!isInitialized || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않았으면 로그인 페이지로 이동
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 로그인된 사용자를 위한 리다이렉트 컴포넌트
const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isInitialized, loading } = useAppSelector(
    (state) => state.auth
  );

  // 인증이 초기화되지 않았거나 로딩 중이면 로딩 상태 유지
  if (!isInitialized || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 인증된 사용자는 홈으로 리다이렉트
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const initApp = async () => {
      dispatch(initializeAuth());
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          await dispatch(refreshUserToken()).unwrap();
        } catch (error) {
          // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
          console.error("토큰 갱신 실패, 로그인 필요");
        }
      }
      dispatch(setInitialized());
    };

    initApp();
  }, [dispatch]);

  return (
    <div className="App">
      <Routes>
        <Route
          path="/register/*"
          element={
            <AuthRedirect>
              <RegisterPage />
            </AuthRedirect>
          }
        />
        <Route
          path="/login/*"
          element={
            <AuthRedirect>
              <LoginPage />
            </AuthRedirect>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post/:postId"
          element={
            <ProtectedRoute>
              <PostDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/comment/:commentId"
          element={
            <ProtectedRoute>
              <CommentDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/:username"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
