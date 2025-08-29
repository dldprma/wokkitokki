import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../store/hooks";
import { usePost } from "../../post/hooks/usePost";
import type { Post } from "../../post/type/postTypes";
import ProfileImage from "./ProfileImage";

type TabType = "photos" | "posts" | "reels" | "replies";

interface ProfilePostsProps {
  username?: string;
  activeTab?: string;
  profileReplies?: any[];
}

const ProfilePosts: React.FC<ProfilePostsProps> = ({
  username: propUsername,
  activeTab: propActiveTab,
  profileReplies: propProfileReplies,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [currentPage, setCurrentPage] = useState(0);

  // prop으로 전달된 activeTab이 있으면 사용
  useEffect(() => {
    if (propActiveTab && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab as TabType);
    }
  }, [propActiveTab, activeTab]);

  const {
    profilePosts,
    profilePhotos,
    profileReels,
    profileLoading,
    photosLoading,
    reelsLoading,
    profileHasMore,
    photosHasMore,
    reelsHasMore,
    getProfilePosts,
    getProfilePhotos,
    getProfileReels,
    resetProfilePosts,
    toggleLike,
    toggleRepost,
  } = usePost();

  // Replies 데이터 상태 - props로 받은 데이터 우선 사용
  const [profileReplies, setProfileReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesHasMore, setRepliesHasMore] = useState(false);

  // props로 받은 profileReplies가 있으면 사용
  useEffect(() => {
    if (propProfileReplies && propProfileReplies.length > 0) {
      setProfileReplies(propProfileReplies);
    }
  }, [propProfileReplies]);

  // 중복된 post.id 제거
  const uniquePosts = profilePosts.filter(
    (post: Post, index: number, arr: Post[]) =>
      arr.findIndex((p: Post) => p.id === post.id) === index
  );

  // username 결정: prop으로 받은 username이 있으면 사용, 없으면 현재 로그인한 사용자
  const { user } = useAppSelector((state: any) => state.auth);
  const username = propUsername || (user as any)?.username;

  // 게시글 상세보기로 이동
  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  // 사용자 프로필로 이동
  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  // 탭 변경 시에만 데이터 로드 (무한 루프 방지)
  useEffect(() => {
    if (username) {
      setCurrentPage(0);
      loadTabData(activeTab, 0);
    }
  }, [activeTab, username]);

  const loadTabData = useCallback(
    async (tab: TabType, page: number) => {
      if (!username) return;

      try {
        switch (tab) {
          case "photos":
            await getProfilePhotos(page, 12, username);
            break;
          case "posts":
            await getProfilePosts(page, 10, username);
            break;
          case "reels":
            await getProfileReels(page, 10, username);
            break;
          case "replies":
            await loadProfileReplies(page, 10, username);
            break;
        }
      } catch (error) {
        console.error("탭 데이터 로드 실패:", error);
      }
    },
    [username, getProfilePhotos, getProfilePosts, getProfileReels]
  );

  // Replies 데이터 로드
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
        if (page === 0) {
          setProfileReplies(data.content);
        } else {
          setProfileReplies((prev) => [...prev, ...data.content]);
        }
        setRepliesHasMore(data.hasNext);
      }
    } catch (error) {
      console.error("Replies 로드 실패:", error);
    } finally {
      setRepliesLoading(false);
    }
  };

  // 댓글 개수 실시간 업데이트를 위한 함수
  const updateRepliesCount = (increment: boolean = true) => {
    // 현재 replies 탭이 활성화되어 있으면 댓글 개수 업데이트
    if (activeTab === "replies") {
      // 실제로는 백엔드에서 댓글 개수를 다시 조회해야 하지만,
      // 여기서는 로컬 상태만 업데이트
      // 이 부분은 나중에 더 정확한 구현 필요
    }
  };

  const loadMore = async () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadTabData(activeTab, nextPage);
  };

  // 사진 그리드 렌더링
  const renderPhotosGrid = () => (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {profilePhotos.map((photo: Post) => (
        <div
          key={`profile-photo-${photo.id}`}
          className="flex-shrink-0 w-48 h-48 bg-gray-200 overflow-hidden relative group cursor-pointer rounded-lg"
          onClick={() => handlePostClick(photo.id)}
        >
          <img
            src={photo.imgUrl}
            alt="Post image"
            className="w-full h-full object-cover"
          />
          {/* 호버 시 오버레이 */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm font-medium">
              클릭하여 상세보기
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 포스트 리스트 렌더링
  const renderPostsList = () => {
    if (uniquePosts.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          아직 게시글이 없습니다
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {uniquePosts.map((post: Post) => {
          return (
            <div
              key={`profile-post-${post.id}`}
              className="bg-white rounded-lg shadow-sm p-4 border hover:shadow-md transition-shadow"
            >
              {/* 리포스트 정보 표시 */}
              {post.repostedBy && (
                <div className="repost-info text-sm text-gray-500 mb-2">
                  🔄 {post.repostedBy}님이 리포스트했습니다
                </div>
              )}
              <div className="flex items-start space-x-3">
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleUserClick(post.authorUsername)}
                >
                  <ProfileImage
                    imageUrl={post.authorProfileImg}
                    username={post.authorUsername}
                    size="md"
                    className="w-10 h-10 flex-shrink-0"
                  />
                </div>
                <div className="flex-1">
                  <div
                    className="flex items-center justify-between mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleUserClick(post.authorUsername)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">
                        {post.authorName}
                      </span>
                      <span className="text-gray-500">
                        @{post.authorUsername}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {/* 게시글 내용 */}
                  <div
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    onClick={() => handlePostClick(post.id)}
                  >
                    <p className="text-gray-800 mb-3 leading-relaxed">
                      {post.content}
                    </p>
                    {post.imgUrl && (
                      <div className="mb-3">
                        <img
                          src={post.imgUrl}
                          alt="Post image"
                          className="w-full max-h-96 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* 상호작용 버튼들 */}
                  <div className="flex items-center space-x-6">
                    <button
                      onClick={() => handleCommentClick(post.id)}
                      className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                      aria-label="댓글"
                    >
                      <span>💬</span>
                      <span className="text-sm">{post.commentCount || 0}</span>
                    </button>
                    <button
                      onClick={() => handleRepostToggle(post.id)}
                      className={`flex items-center space-x-2 transition-colors ${
                        post.reposted
                          ? "text-green-500"
                          : "text-gray-500 hover:text-green-500"
                      }`}
                      aria-label="리포스트"
                    >
                      <span>{post.reposted ? "↪️" : "🔄"}</span>
                      <span className="text-sm">{post.repostCount}</span>
                    </button>
                    <button
                      onClick={() => handleLikeToggle(post.id)}
                      className={`flex items-center space-x-2 transition-colors ${
                        post.liked
                          ? "text-red-500"
                          : "text-gray-500 hover:text-red-500"
                      }`}
                      aria-label="좋아요"
                    >
                      <span>{post.liked ? "❤️" : "🤍"}</span>
                      <span className="text-sm">{post.likeCount}</span>
                    </button>
                    <button
                      onClick={() => handleDmClick(post.authorUsername)}
                      className="flex items-center space-x-2 text-gray-500 hover:text-purple-500 transition-colors"
                      aria-label="DM 보내기"
                    >
                      <span>📤</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Replies 렌더링
  const renderReplies = () => {
    if (profileReplies.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          아직 댓글을 단 게시글이 없습니다
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {profileReplies.map((item: any) => {
          // PostWithCommentsDto 구조에 맞춰 렌더링
          const post = item.post;
          const comments = item.relevantComments;

          return (
            <div
              key={`profile-reply-${item.id}`}
              className="bg-white rounded-lg shadow-sm p-4 border hover:shadow-md transition-shadow"
            >
              {/* 원본 게시글 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleUserClick(post.authorUsername)}
                  >
                    <ProfileImage
                      imageUrl={post.authorProfileImg}
                      username={post.authorUsername}
                      size="md"
                      className="w-8 h-8 flex-shrink-0"
                    />
                  </div>
                  <div className="flex-1">
                    <div
                      className="flex items-center justify-between mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleUserClick(post.authorUsername)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          {post.authorName}
                        </span>
                        <span className="text-gray-500">
                          @{post.authorUsername}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div
                      className="cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                      onClick={() => handlePostClick(post.id)}
                    >
                      <p className="text-gray-800 mb-3 leading-relaxed">
                        {post.content}
                      </p>
                      {post.imgUrl && (
                        <div className="mb-3">
                          <img
                            src={post.imgUrl}
                            alt="Post image"
                            className="w-full max-h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 내가 단 댓글 */}
              {comments.map((comment: any) => (
                <div
                  key={`reply-${comment.id}`}
                  className="ml-8 border-l-2 border-blue-200 pl-4"
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleUserClick(comment.authorUsername)}
                    >
                      <ProfileImage
                        imageUrl={comment.authorProfileImg}
                        username={comment.authorUsername}
                        size="md"
                        className="w-8 h-8 flex-shrink-0"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {comment.authorName}
                        </span>
                        <span className="text-gray-500">
                          @{comment.authorUsername}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-gray-800 mb-2">{comment.content}</p>
                        {comment.imageUrl && (
                          <div className="mb-2">
                            <img
                              src={comment.imageUrl}
                              alt="댓글 이미지"
                              className="w-full max-h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>♥ {comment.likeCount || 0}</span>
                          <span>💬 {comment.replyCount || 0}</span>
                          <span>🔄 {comment.repostCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // 릴스 그리드 렌더링
  const renderReelsGrid = () => {
    return (
      <div className="grid grid-cols-3 gap-1">
        {profileReels.map((reel: Post) => (
          <div
            key={`profile-reel-${reel.id}`}
            className="aspect-square bg-gray-200 overflow-hidden relative group cursor-pointer"
            onClick={() => handlePostClick(reel.id)}
          >
            <img
              src={reel.imgUrl}
              alt="Profile reel"
              className="w-full h-full object-cover"
            />
            {/* 호버 시 오버레이 */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-2xl">
                ▶️
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "photos":
        return renderPhotosGrid();
      case "posts":
        return renderPostsList();
      case "reels":
        return renderReelsGrid();
      case "replies":
        return renderReplies();
      default:
        return null;
    }
  };

  const getLoadingState = () => {
    switch (activeTab) {
      case "photos":
        return photosLoading;
      case "posts":
        return profileLoading;
      case "reels":
        return reelsLoading;
      case "replies":
        return repliesLoading;
      default:
        return false;
    }
  };

  const getHasMore = () => {
    switch (activeTab) {
      case "photos":
        return photosHasMore;
      case "posts":
        return profileHasMore;
      case "reels":
        return reelsHasMore;
      case "replies":
        return repliesHasMore;
      default:
        return false;
    }
  };

  const getCount = () => {
    switch (activeTab) {
      case "photos":
        return profilePhotos.length;
      case "posts":
        // uniquePosts의 길이 반환 (이미 중복 제거됨)
        return uniquePosts.length;
      case "reels":
        return profileReels.length;
      case "replies":
        return profileReplies.length;
      default:
        return 0;
    }
  };

  // 탭별 제목과 설명 텍스트
  const getTabTitle = () => {
    switch (activeTab) {
      case "photos":
        return "사진";
      case "posts":
        return "게시글";
      case "reels":
        return "릴스";
      case "replies":
        return "댓글";
      default:
        return "게시글";
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case "photos":
        return "첫 번째 사진을 업로드해보세요!";
      case "posts":
        return "첫 번째 게시글을 작성해보세요!";
      case "reels":
        return "첫 번째 동영상을 업로드해보세요!";
      case "replies":
        return "첫 번째 댓글을 작성해보세요!";
      default:
        return "첫 번째 게시글을 작성해보세요!";
    }
  };

  // 좋아요 토글 처리
  const handleLikeToggle = async (postId: number) => {
    try {
      await toggleLike(postId);
      // 데이터 새로고침 제거 - 상태가 즉시 반영되도록
    } catch (error) {
      console.error("ProfilePosts: 좋아요 토글 실패", error);
    }
  };

  // 리포스트 토글 처리
  const handleRepostToggle = async (postId: number) => {
    try {
      const result = await toggleRepost(postId);
    } catch (error) {
      console.error("ProfilePosts: 리포스트 토글 실패", error);
    }
  };

  // 댓글 클릭 처리
  const handleCommentClick = (postId: number) => {
    // 게시글 상세보기로 이동 (댓글 탭으로)
    navigate(`/post/${postId}`);
  };

  // DM 보내기 처리
  const handleDmClick = (username: string) => {
    // DM 페이지로 이동 (향후 구현)
    // TODO: DM 기능 구현 시 navigate(`/dm/${username}`) 사용
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* 콘텐츠 영역 */}
      <div className="p-6">
        {getCount() === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {activeTab === "photos"
                ? "📷"
                : activeTab === "posts"
                ? "📝"
                : "💬"}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              아직 {getTabTitle()}이 없습니다
            </h3>
            <p className="text-gray-600">{getTabDescription()}</p>
          </div>
        ) : (
          <>
            {renderContent()}

            {/* 더보기 버튼 */}
            {getHasMore() && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={profileLoading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {profileLoading ? "로딩 중..." : "더보기"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePosts;
