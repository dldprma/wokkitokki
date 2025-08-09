import React from "react";
import { useAppSelector } from "../../../store/hooks";

const Profile: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로그인이 필요합니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                @{user.username}
              </h1>
              <p className="text-gray-600">{user.fullName}</p>
            </div>
          </div>

          {/* 통계 */}
          <div className="flex space-x-8 mt-8 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-gray-600">게시글</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-gray-600">팔로워</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-gray-600">팔로잉</div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex space-x-4 mt-6">
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              프로필 편집
            </button>
            <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
              설정
            </button>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              아직 게시글이 없습니다
            </h3>
            <p className="text-gray-600">첫 번째 게시글을 작성해보세요!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
