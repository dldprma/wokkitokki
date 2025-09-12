import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { setUser } from "../store/userSlice";
import { logoutUser } from "../../auth/store/authSlice";
import * as userApi from "../api/userApi";
import ProfilePosts from "./ProfilePosts";
import ProfileImage from "./ProfileImage";
import EditProfile from "./EditProfile";
import { updateProfileImage } from "../../auth/store/authSlice";
import { useMessage } from "../../message/hooks/useMessage";
import type { UserProfile } from "../types/userTypes";
import { usePost } from "../../post/hooks/usePost";
import { useUser } from "../hooks/useUser";
import { settingAccessToken } from "../../../utils/axios";

interface ProfileProps {
  username?: string;
}

const Profile: React.FC<ProfileProps> = ({ username: propUsername }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    user: currentUser,
    isAuthenticated,
    accessToken,
  } = useAppSelector((state) => state.auth);

  // Redux store의 user 상태를 직접 구독
  const profileUser = useAppSelector((state) => state.user.user);

  // username 결정: prop으로 받은 username이 있으면 사용, 없으면 현재 로그인한 사용자
  const profileUsername = propUsername || currentUser?.username;

  // 현재 로그인한 사용자의 username
  const currentUsername = currentUser?.username;

  // 메시지 관련 훅
  const { createRoom } = useMessage();

  // 모달 상태
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "posts" | "photos" | "reels" | "replies"
  >("posts");
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 팔로워/팔로잉 데이터 상태
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  // Replies 데이터 상태
  const [profileReplies, setProfileReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // 로컬 팔로우 상태 관리
  const [localIsFollowing, setLocalIsFollowing] = useState<boolean>(false);
  const [localFollowerCount, setLocalFollowerCount] = useState<number>(0);

  // accessToken이 있을 때 axios 인터셉터에 설정
  useEffect(() => {
    if (accessToken) {
      settingAccessToken(accessToken);
    }
  }, [accessToken]);

  // 메뉴 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".menu-container")) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    toggleLike,
    toggleRepost,
  } = usePost();

  // 사용자 관련 기능은 useUser에서 가져오기
  const { removeProfileImage } = useUser();

  // 회원탈퇴 처리
  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "정말로 회원을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }

    try {
      // 회원탈퇴 API 호출
      await userApi.deleteUser();

      // 로그아웃 처리
      await dispatch(logoutUser());

      // 홈페이지로 이동
      navigate("/");

      alert("회원탈퇴가 완료되었습니다.");
    } catch (error) {
      console.error("회원탈퇴 실패:", error);
      alert("회원탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // profileUsername이 변경될 때마다 프로필 데이터 로드
  useEffect(() => {
    if (profileUsername && currentUsername && isAuthenticated && accessToken) {
      loadProfileData();
    }
  }, [profileUsername, currentUsername, isAuthenticated, accessToken]);

  // Replies 데이터 로드 함수
  const loadProfileReplies = async (
    page: number,
    size: number,
    username: string
  ) => {
    setRepliesLoading(true);
    try {
      const response = await fetch(
        `/api/users/${username}/commented-posts?page=${page}&size=${size}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // 백엔드에서 PostWithCommentsDto 배열을 반환하므로 content 사용
        setProfileReplies(data.content || []);
      }
    } catch (error) {
      console.error("Replies 로드 실패:", error);
    } finally {
      setRepliesLoading(false);
    }
  };

  // 프로필 데이터 로드 함수
  const loadProfileData = async () => {
    if (!profileUsername || !currentUsername) {
      return;
    }

    try {
      // 사용자 프로필 정보 가져오기 (현재 사용자 정보 포함)
      const profileData = await userApi.getUserProfile(
        profileUsername,
        currentUsername
      );

      // Redux store 업데이트
      dispatch(setUser(profileData));

      // 로컬 상태도 업데이트
      setLocalIsFollowing(profileData.isFollowing || false);
      setLocalFollowerCount(profileData.followersCount || 0);

      // 포스트 데이터 가져오기
      await getProfilePosts(0, 10, profileUsername);
      await getProfilePhotos(0, 12, profileUsername);
      await getProfileReels(0, 10, profileUsername);

      // Replies 데이터 가져오기
      await loadProfileReplies(0, 10, profileUsername);
    } catch (error) {
      console.error("프로필 데이터 로드 실패:", error);
    }
  };

  // 팔로우/언팔로우 처리
  const handleToggleFollow = async () => {
    if (!profileUsername) return;

    try {
      // 팔로우 토글 API 호출
      const result = await userApi.toggleFollow(profileUsername);

      // Redux store를 즉시 업데이트
      if (result.targetUserProfile) {
        dispatch(setUser(result.targetUserProfile));

        // 로컬 상태도 즉시 업데이트
        setLocalIsFollowing(result.isFollowing);
        setLocalFollowerCount(result.targetUserProfile.followersCount || 0);
      }
    } catch (error) {
      console.error("팔로우/언팔로우 실패:", error);
      alert("팔로우 상태 변경에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 좋아요 토글 처리
  const handleLikeToggle = async (postId: number) => {
    if (!profileUsername) return;
    try {
      await toggleLike(postId);
      // 프로필 데이터 새로고침
      await getProfilePosts(0, 10, profileUsername);
    } catch (error) {
      console.error("Profile: 좋아요 토글 실패", error);
    }
  };

  // 리포스트 토글 처리
  const handleRepostToggle = async (postId: number) => {
    if (!profileUsername) return;
    try {
      await toggleRepost(postId);
      // 프로필 데이터 새로고침
      await getProfilePosts(0, 10, profileUsername);
    } catch (error) {
      console.error("Profile: 리포스트 토글 실패", error);
    }
  };

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
      if (profileUsername) {
        // 프로필 이미지 업로드
        const result = await userApi.uploadProfileImage(file);

        // 성공 시 auth 상태의 user.profileImgUrl 즉시 업데이트
        if (result && result.imageUrl) {
          const newImageUrl = result.imageUrl;

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
          await loadProfileData();

          alert("프로필 이미지가 변경되었습니다!");
        } catch (refreshError) {
          console.error("데이터 새로고침 에러:", refreshError);
        }
      }
    } catch (error: any) {
      console.error("프로필 이미지 변경 에러:", error);
      const errorMessage =
        error?.message || "프로필 이미지 변경에 실패했습니다.";
      alert(errorMessage);
    }

    // 파일 입력 초기화
    e.target.value = "";
  };

  // 팔로워 모달 열기
  const handleOpenFollowersModal = async () => {
    if (!profileUsername) return;

    setFollowersLoading(true);
    try {
      const result = await userApi.getFollowers(profileUsername, 0, 20);
      setFollowers(result.content);
    } catch (error) {
      console.error("팔로워 목록 조회 실패:", error);
    } finally {
      setFollowersLoading(false);
    }
    setShowFollowersModal(true);
  };

  // 팔로잉 모달 열기
  const handleOpenFollowingModal = async () => {
    if (!profileUsername) return;

    setFollowingLoading(true);
    try {
      const result = await userApi.getFollowing(profileUsername, 0, 20);
      setFollowing(result.content);
    } catch (error) {
      console.error("팔로잉 목록 조회 실패:", error);
    } finally {
      setFollowingLoading(false);
    }
    setShowFollowingModal(true);
  };

  // 메시지 버튼 클릭 핸들러
  const handleSendMessage = async () => {
    console.log("profileUser:", profileUser);
    console.log("profileUser.id:", profileUser?.id);
    console.log("profileUser.username:", profileUser?.username);

    if (!profileUser?.username) {
      console.error("profileUser.username이 없습니다:", profileUser);
      alert("사용자 정보를 불러올 수 없습니다. 다시 시도해주세요.");
      return;
    }

    try {
      // 해당 사용자와의 채팅방 생성 또는 이동 (username 사용)
      const roomId = await createRoom([profileUser.username]);
      console.log("생성된 roomId:", roomId);

      if (!roomId) {
        alert("채팅방을 생성할 수 없습니다. 다시 시도해주세요.");
        return;
      }

      navigate(`/messages/${roomId}`);
    } catch (error) {
      console.error("채팅방 생성 실패:", error);
      alert("메시지 전송에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (!profileUsername || !isAuthenticated) {
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
            <div className="relative">
              <ProfileImage
                imageUrl={profileUser?.profileImgUrl}
                username={profileUser?.username || profileUsername}
                size="xl"
                className="w-[100px] h-[100px] rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              />
              {/* 프로필 이미지 변경 입력 - 현재 사용자일 때만 */}
              {profileUser && profileUser?.username === currentUsername && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="absolute inset-0 w-full h-[150px] opacity-0 cursor-pointer"
                  title="프로필 이미지 변경"
                />
              )}
            </div>

            {/* 사용자 정보 */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profileUser?.fullName || "사용자"}
                </h1>

                {/* 현재 사용자일 때만 메뉴 버튼 표시 */}
                {profileUser && profileUser?.username === currentUsername && (
                  <div className="relative menu-container">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="메뉴"
                    >
                      ⋯
                    </button>

                    {/* 드롭다운 메뉴 */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setShowEditProfileModal(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 first:rounded-t-lg"
                        >
                          ✏️ 프로필 수정
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteAccount();
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                        >
                          🗑️ 회원탈퇴
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 다른 사용자일 때만 팔로우 버튼과 메시지 버튼 표시 */}
                {profileUser && profileUser?.username !== currentUsername && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleToggleFollow}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        localIsFollowing
                          ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {localIsFollowing ? "UnFollow" : "Follow"}
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="px-3 py-1.5 text-sm rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
                    >
                      💬 메시지
                    </button>
                  </div>
                )}
              </div>

              <p className="text-gray-600 mt-1">@{profileUser?.username}</p>

              {/* 바이오 - profileUser에서 가져오기 */}
              {profileUser?.bio && (
                <p className="text-gray-700 mt-2">{profileUser.bio}</p>
              )}
            </div>
          </div>

          {/* 통계 정보 - 아래쪽에 배치 */}
          <div className="flex items-center space-x-6 mt-6 border-t pt-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {profileUser?.postCount || 0}
              </div>
              <div className="text-sm text-gray-600">게시글</div>
            </div>

            <button
              onClick={handleOpenFollowersModal}
              className="text-center hover:text-blue-600 transition-colors cursor-pointer"
            >
              <div className="text-lg font-semibold text-gray-900">
                {localFollowerCount}
              </div>
              <div className="text-sm text-gray-600">팔로워</div>
            </button>

            <button
              onClick={handleOpenFollowingModal}
              className="text-center hover:text-blue-600 transition-colors cursor-pointer"
            >
              <div className="text-lg font-semibold text-gray-900">
                {profileUser?.followingCount || 0}
              </div>
              <div className="text-sm text-gray-600">팔로잉</div>
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex space-x-1 mt-6 border-b border-gray-200">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "posts"
                ? "bg-blue-500 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("posts")}
          >
            Posts ({profileUser?.postCount || 0})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "replies"
                ? "bg-blue-500 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("replies")}
          >
            Replies
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "photos"
                ? "bg-blue-500 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("photos")}
          >
            Images (
            {profilePhotos.length > 0
              ? profilePhotos.length
              : profileUser?.imagePostCount || 0}
            )
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "reels"
                ? "bg-blue-500 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("reels")}
          >
            reels ({profileReels.length > 0 ? profileReels.length : 0})
          </button>
        </div>

        {/* 프로필 포스트 */}
        <div className="mt-6">
          {activeTab === "posts" ? (
            <ProfilePosts username={profileUsername} activeTab={activeTab} />
          ) : activeTab === "replies" ? (
            <ProfilePosts
              username={profileUsername}
              activeTab={activeTab}
              profileReplies={profileReplies}
            />
          ) : activeTab === "photos" ? (
            <div className="grid grid-cols-3 gap-4">
              {profilePhotos.map((photo) => (
                <div
                  key={`photo-${photo.id}`}
                  className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    // 사진 클릭 시 게시글 상세보기로 이동
                    navigate(`/post/${photo.id}`);
                  }}
                >
                  {photo.imgUrl && (
                    <img
                      src={photo.imgUrl}
                      alt="사진"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : activeTab === "reels" && profileReels.length > 0 ? (
            <div className="space-y-4">
              {profileReels.map((reel) => (
                <div
                  key={`reel-${reel.id}`}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/post/${reel.id}`)}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200">
                      {reel.authorProfileImg && (
                        <img
                          src={reel.authorProfileImg}
                          alt={reel.authorName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {reel.authorName}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{reel.authorUsername}
                      </div>
                    </div>
                  </div>
                  <div className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <p className="text-gray-800 mb-3">{reel.content}</p>
                    {reel.imgUrl && (
                      <img
                        src={reel.imgUrl}
                        alt="릴스 이미지"
                        className="w-full rounded-lg"
                      />
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-3">
                    <span>❤️ {reel.likeCount}</span>
                    <span>🔄 {reel.repostCount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {(activeTab as any) === "posts" && "아직 게시글이 없습니다"}
              {(activeTab as any) === "photos" && "아직 사진이 없습니다"}
              {(activeTab as any) === "reels" && "아직 릴스가 없습니다"}
              {(activeTab as any) === "replies" &&
                "아직 댓글을 단 게시글이 없습니다"}
            </div>
          )}
        </div>
      </div>

      {/* 팔로워 모달 */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Follower</h3>
              <button
                onClick={() => setShowFollowersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {followersLoading ? (
              <div className="text-center text-gray-500 py-8">로딩 중...</div>
            ) : followers.length > 0 ? (
              <div className="space-y-3">
                {followers.map((follower) => (
                  <div
                    key={`follower-${follower.id}`}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => navigate(`/${follower.username}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0">
                      {follower.profileImgUrl && (
                        <img
                          src={follower.profileImgUrl}
                          alt={follower.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {follower.fullName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        @{follower.username}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                아직 팔로워가 없습니다
              </div>
            )}
          </div>
        </div>
      )}

      {/* 팔로잉 모달 */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Following</h3>
              <button
                onClick={() => setShowFollowingModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {followingLoading ? (
              <div className="text-center text-gray-500 py-8">로딩 중...</div>
            ) : following.length > 0 ? (
              <div className="space-y-3">
                {following.map((followed) => (
                  <div
                    key={`followed-${followed.id}`}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => navigate(`/${followed.username}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0">
                      {followed.profileImgUrl && (
                        <img
                          src={followed.profileImgUrl}
                          alt={followed.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {followed.fullName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        @{followed.username}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                아직 팔로잉하는 사용자가 없습니다
              </div>
            )}
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
                  if (profileUsername) {
                    loadProfileData();
                    // 포스트 데이터도 새로고침
                    getProfilePosts(0, 10, profileUsername);
                    getProfilePhotos(0, 12, profileUsername);
                    getProfileReels(0, 10, profileUsername);
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
