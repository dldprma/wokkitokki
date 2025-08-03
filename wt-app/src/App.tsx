import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { useEffect } from "react";
import { initializeAuth } from "./features/auth/store/authSlice";
import { LoginForm, RegisterForm } from "./features/auth";
import Home from "./Home";

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

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route
              path="/register"
              element={
                <AuthRedirect>
                  <RegisterForm />
                </AuthRedirect>
              }
            />
            <Route
              path="/login"
              element={
                <AuthRedirect>
                  <LoginForm />
                </AuthRedirect>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
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
