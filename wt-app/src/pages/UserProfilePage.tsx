import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import Layout from "../features/home/components/Layout";
import Profile from "../features/user/components/Profile";
import * as userApi from "../features/user/api/userApi";

const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserExists = async () => {
      if (!username) {
        setUserExists(false);
        setIsLoading(false);
        return;
      }

      try {
        await userApi.getUserProfile(username);
        setUserExists(true);
      } catch (error) {
        if (error && typeof error === "object" && "response" in error) {
          const apiError = error as any;
          const status = apiError.response?.status;
          if (status === 403) {
            // 403은 보통 권한 문제이므로 사용자는 존재할 수 있음
            // 하지만 현재는 보안 설정을 수정했으므로 403이 발생하지 않아야 함
            console.warn("사용자 접근 권한 문제:", apiError.response?.data);
            setUserExists(true);
            return;
          }
        }
        setUserExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserExists();
  }, [username]);

  // 로딩 중
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500">사용자 정보를 확인하는 중...</div>
        </div>
      </Layout>
    );
  }

  // username이 없거나 잘못된 경우
  if (!username || !userExists) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">
              사용자를 찾을 수 없습니다
            </h2>
            <p className="text-gray-500 mb-6">
              입력하신 사용자명 "{username}"이 존재하지 않거나 잘못되었습니다.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              이전 페이지로 돌아가기
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <Profile username={username} />
      </Layout>
    </>
  );
};

export default UserProfilePage;
