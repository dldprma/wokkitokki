import React, { useEffect, useCallback, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { useUser } from "../hooks/useUser";
import { usePost } from "../../post/hooks/usePost";
import ProfilePosts from "./ProfilePosts";
import ProfileImage from "./ProfileImage";
import { settingAccessToken } from "../../../utils/axios";
import EditProfile from "./EditProfile";
import { updateProfileImage } from "../../auth/store/authSlice";

const Profile: React.FC = () => {
  const dispatch = useAppDispatch();
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
  const { user: profileUser, getProfile, uploadProfileImage } = useUser();

  // 프로필 이미지 변경 처리
  const handleProfileImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검증 (10MB 이하)
    if (file.size > 10 * 1024 * 1024) {
      alert("이미지 크기는 10MB 이하여야 합니다.");
      return;
    }

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    try {
      if (username) {
        // 프로필 이미지 업로드
        const result = await uploadProfileImage(file);

        // 성공 시 auth 상태의 user.profileImgUrl 즉시 업데이트
        if (result && result.payload && (result.payload as any).imageUrl) {
          const newImageUrl = (result.payload as any).imageUrl;

          // Redux auth 상태 즉시 업데이트
          dispatch(updateProfileImage(newImageUrl));

          // localStorage의 user 정보 업데이트
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            userData.profileImgUrl = newImageUrl;
            localStorage.setItem("user", JSON.stringify(userData));
          }
        }

        // 성공 시 프로필 데이터 새로고침
        try {
          await getProfile(username);

          // 프로필 포스트 데이터도 새로고침 (프로필 이미지 업데이트를 위해)
          await getProfilePosts(0, 10, username);
          await getProfilePhotos(0, 12, username);
          await getProfileReels(0, 10, username);

          alert("프로필 이미지가 변경되었습니다!");
        } catch (refreshError) {
          console.error("데이터 새로고침 에러:", refreshError);
          // 이미지 업로드는 성공했으므로 성공 메시지 표시
          alert(
            "프로필 이미지가 변경되었습니다! (데이터 새로고침에 일부 문제가 있을 수 있습니다)"
          );
        }
      }
    } catch (error: any) {
      console.error("프로필 이미지 변경 에러:", error);
      const errorMessage =
        error?.payload ||
        error?.message ||
        "프로필 이미지 변경에 실패했습니다.";
      alert(errorMessage);
    }

    // 파일 입력 초기화
    e.target.value = "";
  };

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
            {/* 프로필 이미지 - 제일 왼쪽에 300px 크기로 배치 */}
            <div className="relative">
              <ProfileImage
                imageUrl={
                  (user as any)?.profileImgUrl || profileUser?.profileImgUrl
                }
                username={
                  (user as any)?.username || profileUser?.username || ""
                }
                size="xl"
                className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              />
              {/* 현재 사용자일 때만 프로필 이미지 변경 가능 */}
              {(!profileUser ||
                profileUser?.username === (user as any)?.username) && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="absolute inset-0 w-full h-[300px] opacity-0 cursor-pointer"
                  title="프로필 이미지 변경"
                />
              )}
            </div>

            {/* 사용자 정보 */}
            <div className="flex-1">
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
                        profileUser?.isFollowing
                          ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {profileUser?.isFollowing ? "언팔로우" : "팔로우"}
                    </button>
                  )}
              </div>

              <p className="text-gray-600 mt-1">
                @{profileUser?.username || (user as any)?.username}
              </p>

              {/* 바이오 - profileUser 또는 auth.user에서 가져오기 */}
              {(profileUser?.bio || (user as any)?.bio) && (
                <p className="text-gray-700 mt-2">
                  {profileUser?.bio || (user as any)?.bio}
                </p>
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
                {profileUser?.followerCount || 0}
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
