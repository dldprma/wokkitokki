import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useHome } from "../hooks/useHome";
// import { useUser } from "../../user/hooks/useUser";
import { useAuth } from "../../auth/hooks/useAuth";
import { useMessage } from "../../message/hooks/useMessage";
import ProfileImage from "../../user/components/ProfileImage";
import { CommentPreview } from "../../comment";
import UserSelectModal from "../../message/components/UserSelectModal";
import "../../../css/Home.css";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { setLoading, setError } from "../store/homeSlice";

const Home: React.FC = () => {
  const dispatch = useAppDispatch();

  const {
    isAuthenticated,
    isInitialized,
    loading: authLoading,
  } = useAppSelector((state) => state.auth);
  const {
    loading,
    error,
    hasMore,
    page,
    getPosts: originalGetPosts,
    createPost,
    toggleLike,
    toggleRepost,
    // deletePost,
  } = useHome();

  // getPosts 함수를 useCallback으로 최적화
  const getPosts = useCallback(originalGetPosts, [originalGetPosts]);
  const { posts: feedPosts } = useAppSelector((state) => state.home);
  // const { profileUser } = useUser();
  const { user: authUser } = useAuth();
  const { createRoom } = useMessage();
  const navigate = useNavigate();
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 사용자 프로필로 이동
  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  // 게시글 상세보기로 이동
  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`, { state: { from: "/" } });
  };

  useEffect(() => {
    if (
      isInitialized &&
      isAuthenticated &&
      !authLoading &&
      isInitialLoad.current
    ) {
      isInitialLoad.current = false;

      // API 호출에 타임아웃 설정
      const timeoutId = setTimeout(() => {
        dispatch(setLoading(false));
        dispatch(setError("데이터 로드 시간 초과"));
      }, 10000); // 10초 타임아웃

      getPosts(0, 10).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  }, [isInitialized, isAuthenticated, authLoading, dispatch]);

  // 무한 스크롤 설정
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          const nextPage = page + 1;
          getPosts(nextPage, 10);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, page, getPosts]);

  const handleCreatePost = useCallback(async () => {
    if (!newPostContent.trim() && !selectedImage) return;

    try {
      await createPost({
        content: newPostContent,
        imgUrl: selectedImage || undefined,
      });

      setNewPostContent("");
      setSelectedImage(null);
      setImagePreview("");

      // 피드 새로고침
      getPosts(0, 10);
    } catch (error) {
      alert("게시글 작성에 실패했습니다. 다시 시도해주세요.");
    }
  }, [newPostContent, selectedImage, createPost, getPosts]);

  // 이미지 선택 처리
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 검증 (5MB 이하)
      if (file.size > 10 * 1024 * 1024) {
        alert("이미지 크기는 10MB 이하여야 합니다.");
        return;
      }

      // 파일 타입 검증
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 첨부할 수 있습니다.");
        return;
      }

      setSelectedImage(file);

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 이미지 첨부 버튼 클릭
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleLike = async (postId: number) => {
    try {
      await toggleLike(postId);
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
    }
  };

  const handleRepost = async (postId: number) => {
    try {
      await toggleRepost(postId);
    } catch (error) {
      console.error("리포스트 처리 실패:", error);
    }
  };

  // 게시글 삭제는 현재 화면에서 사용되지 않음

  const formatTimeAgo = (createdAt: string) => {
    const now = new Date();
    const postTime = new Date(createdAt);
    const diffInMinutes = Math.floor(
      (now.getTime() - postTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}일 전`;
    }
  };

  return (
    <main className="home-container">
      <header className="home-header">
        <h1 className="home-title">홈</h1>
      </header>

      {/* 새 게시글 작성 */}
      <section className="new-post-section">
        <article className="new-post-container">
          <div className="new-post-content">
            <div className="relative">
              <ProfileImage
                imageUrl={authUser?.profileImgUrl}
                username={authUser?.username || ""}
                size="md"
                className="new-post-avatar"
              />
              {!authUser?.profileImgUrl && (
                <button
                  onClick={() => navigate(`/${authUser?.username}`)}
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                  title="프로필 이미지 설정"
                >
                  <span className="text-white text-xs">+</span>
                </button>
              )}
            </div>
            <div className="new-post-input-section">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="무슨 일이 일어나고 있나요?"
                className="new-post-textarea"
                rows={3}
                aria-label="새 게시글 작성"
              />

              {/* 이미지 미리보기 */}
              {imagePreview && (
                <div className="image-preview-container">
                  <img
                    src={imagePreview}
                    alt="이미지 미리보기"
                    className="image-preview"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="remove-image-button"
                    aria-label="이미지 제거"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 이미지 첨부 버튼과 게시글 작성 버튼 */}
              <div className="new-post-actions">
                <button
                  onClick={handleImageButtonClick}
                  className="image-attach-button"
                  aria-label="이미지 첨부"
                >
                  📷
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() && !selectedImage}
                  className="post-submit-button"
                >
                  게시글 작성
                </button>
              </div>

              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
            </div>
          </div>
        </article>
      </section>

      {/* 게시글 목록 */}
      <section className="posts-section">
        <div className="posts-container">
          {feedPosts
            .filter((item: any, index: number, arr: any[]) => {
              // PostWithCommentsDto는 상단 id가 없을 수 있으므로 안정적 키로 비교
              const makeKey = (x: any) =>
                x.post && Array.isArray(x.relevantComments)
                  ? `pwc-${x.post.id}-${x.relevantComments?.[0]?.id ?? "none"}`
                  : `post-${x.id}`;
              const key = makeKey(item);
              return index === arr.findIndex((i: any) => makeKey(i) === key);
            })
            .map((item: any) => {
              // 댓글 관련 데이터 확인
              // const hasRelevantComments =
              //   item.relevantComments && item.relevantComments.length > 0;
              // const hasComments = item.comments && item.comments.length > 0;
              // const isCommentActivity =
              //   item.feedType === "comment" || item.activitySummary;

              // 댓글이 포함된 게시글인 경우 (PostWithCommentsDto 구조)
              if (item.post && Array.isArray(item.relevantComments)) {
                return (
                  <article
                    key={`home-post-with-comments-${item.post.id}`}
                    className="post-card"
                  >
                    {/* 리포스트 정보 표시 */}
                    {item.post.repostedBy && (
                      <div className="repost-info text-sm text-gray-500 mb-2 p-2 bg-green-50 rounded-lg">
                        🔄 {item.post.repostedBy}님이 리포스트했습니다
                      </div>
                    )}

                    {/* 활동 요약 표시 */}
                    {item.activitySummary && (
                      <div className="activity-summary text-sm text-gray-500 mb-2 p-2 bg-blue-50 rounded-lg">
                        {item.activitySummary}
                      </div>
                    )}

                    {/* 원본 게시글 표시 */}
                    <div className="flex items-start space-x-3">
                      <div
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() =>
                          handleUserClick(item.post.authorUsername)
                        }
                      >
                        <ProfileImage
                          imageUrl={item.post.authorProfileImg}
                          username={item.post.authorUsername}
                          size="md"
                          className="w-10 h-10 flex-shrink-0"
                        />
                      </div>
                      <div className="flex-1">
                        <div
                          className="flex items-center justify-between mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() =>
                            handleUserClick(item.post.authorUsername)
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">
                              {item.post.authorName}
                            </span>
                            <span className="text-gray-500">
                              @{item.post.authorUsername}
                            </span>
                          </div>
                          <span className="text-gray-400 text-sm">
                            {formatTimeAgo(item.post.createdAt)}
                          </span>
                        </div>

                        {/* 게시글 내용 */}
                        <div
                          className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                          onClick={() => handlePostClick(item.post.id)}
                        >
                          <p className="text-gray-800 mb-3 leading-relaxed">
                            {item.post.content}
                          </p>
                          {item.post.imgUrl && (
                            <div className="mb-3">
                              <img
                                src={item.post.imgUrl}
                                alt="Post image"
                                className="w-full max-h-96 object-cover rounded-lg"
                              />
                            </div>
                          )}
                        </div>

                        {/* 댓글 미리보기 (선으로 연결된 형태) */}
                        <div className="mt-3">
                          <div className="comment-preview-connector">
                            <div className="comment-preview-connector-line"></div>
                          </div>
                          <div className="comment-preview-item">
                            <div className="comment-preview-item-connector">
                              <div className="comment-preview-item-line"></div>
                            </div>
                            <div className="comment-preview-content-wrapper">
                              <div className="comment-preview-header">
                                <div className="comment-preview-author-info">
                                  <img
                                    src={
                                      item.relevantComments?.[0]
                                        ?.authorProfileImg ||
                                      "/default-avatar.png"
                                    }
                                    alt="댓글 작성자"
                                    className="comment-preview-avatar"
                                  />
                                  <div className="comment-preview-author-details">
                                    <span className="comment-preview-author-name">
                                      {item.relevantComments?.[0]?.authorName ||
                                        "댓글 작성자"}
                                    </span>
                                    <span className="comment-preview-author-username">
                                      @
                                      {item.relevantComments?.[0]
                                        ?.authorUsername || "username"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="comment-preview-text">
                                <span className="comment-preview-content">
                                  {item.relevantComments?.[0]?.content ||
                                    "댓글 내용을 불러올 수 없습니다"}
                                </span>
                              </div>

                              {item.relevantComments?.[0]?.imageUrl && (
                                <div className="comment-preview-image">
                                  <img
                                    src={item.relevantComments[0].imageUrl}
                                    alt="댓글 이미지"
                                    className="comment-preview-image-content"
                                  />
                                </div>
                              )}

                              <div className="comment-preview-actions">
                                {item.relevantComments?.[0]?.replyCount > 0 && (
                                  <span className="comment-preview-action">
                                    💬 {item.relevantComments[0].replyCount}
                                  </span>
                                )}
                                {item.relevantComments?.[0]?.likeCount > 0 && (
                                  <span className="comment-preview-action">
                                    ♥ {item.relevantComments[0].likeCount}
                                  </span>
                                )}
                              </div>

                              <div className="comment-preview-more">
                                <button
                                  onClick={() => handlePostClick(item.post.id)}
                                  className="text-blue-500 text-sm hover:underline"
                                >
                                  원본 게시글 보기
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 상호작용 버튼들 */}
                        <div className="flex items-center space-x-6 mt-3">
                          <button
                            className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                            aria-label="댓글"
                          >
                            <span>💬</span>
                            <span className="text-sm">
                              {item.post.commentCount || 0}
                            </span>
                          </button>
                          <button
                            onClick={() => handleRepost(item.post.id)}
                            className={`flex items-center space-x-2 transition-colors ${
                              item.post.reposted
                                ? "text-green-500"
                                : "text-gray-500 hover:text-green-500"
                            }`}
                            aria-label="리포스트"
                          >
                            <span>{item.post.reposted ? "↪️" : "🔄"}</span>
                            <span className="text-sm">
                              {item.post.repostCount}
                            </span>
                          </button>
                          <button
                            onClick={() => handleLike(item.post.id)}
                            className={`flex items-center space-x-2 transition-colors ${
                              item.post.liked
                                ? "text-red-500"
                                : "text-gray-500 hover:text-red-500"
                            }`}
                            aria-label={
                              item.post.liked ? "좋아요 취소" : "좋아요"
                            }
                          >
                            <span>{item.post.liked ? "❤️" : "🤍"}</span>
                            <span className="text-sm">
                              {item.post.likeCount}
                            </span>
                          </button>
                          <button
                            onClick={() => navigate(`/post/${item.post.id}`)}
                            className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                            aria-label="댓글"
                          >
                            <span>💬</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const shareData = {
                                type: "post",
                                content: item.post.content,
                                imageUrl: item.post.imgUrl,
                                authorName: item.post.authorName,
                                postId: item.post.id.toString(),
                              };
                              setSelectedPostForShare(shareData);
                              setShowUserSelectModal(true);
                            }}
                            className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                            aria-label="DM"
                          >
                            <span>📤</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }

              // 게시글인 경우
              return (
                <article key={`home-post-${item.id}`} className="post-card">
                  {/* 리포스트 정보 표시 */}
                  {item.repostedBy && (
                    <div className="repost-info text-sm text-gray-500 mb-2 p-2 bg-green-50 rounded-lg">
                      🔄 {item.repostedBy}님이 리포스트했습니다
                    </div>
                  )}
                  <div className="flex items-start space-x-3">
                    <div
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleUserClick(item.authorUsername)}
                    >
                      <ProfileImage
                        imageUrl={item.authorProfileImg}
                        username={item.authorUsername}
                        size="md"
                        className="w-10 h-10 flex-shrink-0"
                      />
                    </div>
                    <div className="flex-1">
                      <div
                        className="flex items-center justify-between mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleUserClick(item.authorUsername)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            {item.authorName}
                          </span>
                          <span className="text-gray-500">
                            @{item.authorUsername}
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      {/* 게시글 내용 */}
                      <div
                        className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={() => handlePostClick(item.id)}
                      >
                        <p className="text-gray-800 mb-3 leading-relaxed">
                          {item.content}
                        </p>
                        {item.imgUrl && (
                          <div className="mb-3">
                            <img
                              src={item.imgUrl}
                              alt="Post image"
                              className="w-full max-h-96 object-cover rounded-lg"
                            />
                          </div>
                        )}

                        {/* 댓글 미리보기 */}
                        {item.comments && item.comments.length > 0 && (
                          <CommentPreview
                            comments={item.comments}
                            postId={item.id}
                            maxComments={2}
                          />
                        )}
                      </div>

                      {/* 상호작용 버튼들 */}
                      <div className="flex items-center space-x-6">
                        <button
                          className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                          aria-label="댓글"
                        >
                          <span>💬</span>
                          <span className="text-sm">
                            {item.commentCount || 0}
                          </span>
                        </button>
                        <button
                          onClick={() => handleRepost(item.id)}
                          className={`flex items-center space-x-2 transition-colors ${
                            item.reposted
                              ? "text-green-500"
                              : "text-gray-500 hover:text-green-500"
                          }`}
                          aria-label="리포스트"
                        >
                          <span>{item.reposted ? "↪️" : "🔄"}</span>
                          <span className="text-sm">{item.repostCount}</span>
                        </button>
                        <button
                          onClick={() => handleLike(item.id)}
                          className={`flex items-center space-x-2 transition-colors ${
                            item.liked
                              ? "text-red-500"
                              : "text-gray-500 hover:text-red-500"
                          }`}
                          aria-label={item.liked ? "좋아요 취소" : "좋아요"}
                        >
                          <span>{item.liked ? "❤️" : "🤍"}</span>
                          <span className="text-sm">{item.likeCount}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const shareData = {
                              type: "post",
                              content: item.content,
                              imageUrl: item.imgUrl,
                              authorName: item.authorName,
                              postId: item.id.toString(),
                            };
                            setSelectedPostForShare(shareData);
                            setShowUserSelectModal(true);
                          }}
                          className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                          aria-label="DM"
                        >
                          <span>📤</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      {/* 게시글이 없을 때 메시지 */}
      {!loading && feedPosts.length === 0 && (
        <section className="no-posts-section">
          <div className="no-posts-container">
            <div className="no-posts-icon">📝</div>
            <h3 className="no-posts-title">아직 게시글이 없습니다</h3>
            <p className="no-posts-description">
              첫 번째 게시글을 작성해보세요!
            </p>
          </div>
        </section>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <section className="loading-section">
          <div className="loading-container">
            <div className="loading-spinner" aria-label="로딩 중"></div>
          </div>
        </section>
      )}

      {/* 에러 메시지 */}
      {error && (
        <section className="error-section">
          <div className="error-message" role="alert">
            {error}
          </div>
        </section>
      )}

      {/* 무한 스크롤 트리거 */}
      <section className="load-more-section" ref={loadMoreRef}>
        <div className="load-more-container">
          {loading ? (
            <div className="loading-spinner" aria-label="로딩 중"></div>
          ) : hasMore ? (
            <div className="load-more-text">
              더 많은 게시글을 불러오는 중...
            </div>
          ) : (
            <div className="load-more-text">모든 게시글을 불러왔습니다</div>
          )}
        </div>
      </section>

      {/* 사용자 선택 모달 */}
      <UserSelectModal
        isOpen={showUserSelectModal}
        onClose={() => {
          setShowUserSelectModal(false);
          setSelectedPostForShare(null);
        }}
        shareContent={selectedPostForShare}
      />
    </main>
  );
};

export default Home;
