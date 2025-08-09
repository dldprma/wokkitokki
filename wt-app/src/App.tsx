import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { useEffect } from "react";
import {
  initializeAuth,
  refreshUserToken,
  setInitialized,
} from "./features/auth/store/authSlice";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import UserPage from "./pages/UserPage";

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
        dispatch(refreshUserToken());
      } else {
        dispatch(setInitialized());
      }
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
              path="/profile/*"
              element={
                <ProtectedRoute>
                  <UserPage />
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
