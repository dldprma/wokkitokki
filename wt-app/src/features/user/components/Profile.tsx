import React, { useEffect, useCallback, useState } from "react";
import { useAppSelector } from "../../../store/hooks";
import { useUser } from "../hooks/useUser";
import { usePost } from "../../post/hooks/usePost";
import ProfilePosts from "./ProfilePosts";
import ProfileImage from "./ProfileImage";
import { settingAccessToken } from "../../../utils/axios";
import EditProfile from "./EditProfile";

const Profile: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { isAuthenticated, accessToken } = useAppSelector(
    (state) => state.auth
  );

  // 모달 상태
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // accessToken이 있을 때 axios 인터셉터에 설정
  useEffect(() => {
    if (accessToken) {
      settingAccessToken(accessToken);
    }
  }, [accessToken]);

  // 포스트 관련 기능은 usePost에서 직접 가져오기
  const {
    profilePosts,
    profilePhotos,
    profileReels,
    profileLoading,
    photosLoading,
    reelsLoading,
    getProfilePosts,
    getProfilePhotos,
    getProfileReels,
  } = usePost();

  // 사용자 관련 기능은 useUser에서 가져오기
  const { user: profileUser, getProfile } = useUser();

  // 프로필 데이터 로드
  const loadProfileData = async () => {
    if (user && isAuthenticated && accessToken) {
      const username = (user as any)?.username;

      if (
        username &&
        username !== "undefined" &&
        typeof username === "string" &&
        username.trim() !== ""
      ) {
        try {
          // 프로필 데이터 가져오기
          await getProfile(username);

          // 포스트 데이터 가져오기
          await getProfilePosts(0, 10, username);
          await getProfilePhotos(0, 12, username);
          await getProfileReels(0, 10, username);
        } catch (error) {
          console.error("프로필 데이터 로드 실패:", error);
        }
      }
    }
  };

  // user 상태가 안정화된 후에만 실행
  useEffect(() => {
    // user 객체가 완전히 로드된 후에만 실행
    if (user && (user as any)?.username && isAuthenticated && accessToken) {
      loadProfileData();
    }
  }, [user?.username, isAuthenticated, accessToken]); // user 전체가 아닌 username만 의존성으로

  // username 추출 (조건부 렌더링에서 사용) - user가 로드된 후에만
  const username =
    user && (user as any)?.username ? (user as any).username : null;

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로그인이 필요합니다.</div>
      </div>
    );
  }

  // accessToken이 없는 경우 (토큰 만료 등)
  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">
          <div>인증이 만료되었습니다.</div>
          <div className="mt-2">
            <button
              onClick={() => (window.location.href = "/login")}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              다시 로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 전체 포스트 수 계산
  const totalPosts =
    profilePosts.length + profilePhotos.length + profileReels.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-6">
            <ProfileImage
              imageUrl={
                profileUser?.profileImgUrl || (user as any)?.profileImgUrl
              }
              username={profileUser?.username || (user as any)?.username || ""}
              size="lg"
              className="flex-shrink-0 w-32 h-32"
            />

            {/* 사용자 정보 */}
            <div className="flex-1 ml-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profileUser?.fullName || (user as any)?.fullName || "사용자"}
                </h1>

                {/* 현재 사용자일 때만 프로필 수정 버튼 표시 - 오른쪽에 */}
                {(!profileUser ||
                  profileUser?.username === (user as any)?.username) && (
                  <button
                    onClick={() => setShowEditProfileModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    프로필 수정하기
                  </button>
                )}

                {/* 다른 사용자일 때만 팔로우 버튼 표시 - 오른쪽에 */}
                {profileUser &&
                  profileUser?.username !== (user as any)?.username && (
                    <button
                      onClick={() => {
                        /* 팔로우/언팔로우 로직 */
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        profileUser?.following
                          ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {profileUser?.following ? "언팔로우" : "팔로우"}
                    </button>
                  )}
              </div>

              <p className="text-gray-600 mt-1">
                @{profileUser?.username || (user as any)?.username}
              </p>

              {/* 바이오 */}
              {profileUser?.bio && (
                <p className="text-gray-700 mt-2">{profileUser.bio}</p>
              )}
            </div>
          </div>

          {/* 통계 정보 - 아래쪽에 배치 */}
          <div className="flex items-center space-x-6 mt-6 border-t pt-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {profileUser?.postCount || profilePosts.length}
              </div>
              <div className="text-sm text-gray-600">게시글</div>
            </div>

            <button
              onClick={() => setShowFollowersModal(true)}
              className="text-center hover:text-blue-600 transition-colors cursor-pointer"
            >
              <div className="text-lg font-semibold text-gray-900">
                {profileUser?.followersCount || 0}
              </div>
              <div className="text-sm text-gray-600">팔로워</div>
            </button>

            <button
              onClick={() => setShowFollowingModal(true)}
              className="text-center hover:text-blue-600 transition-colors cursor-pointer"
            >
              <div className="text-lg font-semibold text-gray-900">
                {profileUser?.followingCount || 0}
              </div>
              <div className="text-sm text-gray-600">팔로잉</div>
            </button>
          </div>
        </div>

        {/* 프로필 포스트 */}
        {username &&
        username !== "undefined" &&
        typeof username === "string" ? (
          <ProfilePosts />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-gray-600 text-center">
              사용자 정보를 불러오는 중...
            </div>
          </div>
        )}
      </div>

      {/* 팔로워 모달 */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">팔로워</h3>
              <button
                onClick={() => setShowFollowersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="text-center text-gray-500 py-8">
              아직 팔로워가 없습니다
            </div>
          </div>
        </div>
      )}

      {/* 팔로잉 모달 */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">팔로잉</h3>
              <button
                onClick={() => setShowFollowingModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="text-center text-gray-500 py-8">
              아직 팔로잉하는 사용자가 없습니다
            </div>
          </div>
        </div>
      )}

      {/* EditProfile 모달 */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">프로필 수정</h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <EditProfile
                onClose={() => setShowEditProfileModal(false)}
                onSuccess={() => {
                  setShowEditProfileModal(false);
                  // 프로필 데이터 새로고침
                  if (username) {
                    getProfile(username);
                    // 포스트 데이터도 새로고침
                    getProfilePosts(0, 10, username);
                    getProfilePhotos(0, 12, username);
                    getProfileReels(0, 10, username);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
