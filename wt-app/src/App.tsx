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

// axios에 Redux store 설정
setStore(store);

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// 로그인된 사용자를 위한 리다이렉트 컴포넌트
const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return isAuthenticated ? <Navigate to="/" /> : <>{children}</>;
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

  if (!isInitialized) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
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
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search/"
              element={
                <ProtectedRoute>
                  <SearchPage />
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
          </Routes>
        </div>
      </BrowserRouter>
    </>
  );
}

export default App;
