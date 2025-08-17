import React, { useState, useEffect } from "react";
import { useHome } from "../hooks/useHome";
import { useUser } from "../../user/hooks/useUser";
import { usePost } from "../../post/hooks/usePost";
import ProfileImage from "../../user/components/ProfileImage";
import "../../../css/Home.css";
import { useAppSelector } from "../../../store/hooks";

const Home: React.FC = () => {
  const {
    isAuthenticated,
    isInitialized,
    loading: authLoading,
  } = useAppSelector((state) => state.auth);
  const {
    loading,
    error,
    hasMore,
    getFeedPosts,
    createPost,
    toggleLike,
    toggleRepost,
  } = useHome();
  const { feedPosts } = usePost();
  const { user: profileUser } = useUser();
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isInitialized && isAuthenticated && !authLoading) {
      getFeedPosts(0, 10);
    }
  }, [isInitialized, isAuthenticated, authLoading]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) return;

    try {
      const result = await createPost({
        content: newPostContent,
        imgUrl: selectedImage || undefined,
      });

      setNewPostContent("");
      setSelectedImage(null);
      setImagePreview("");

      // 피드 새로고침
      getFeedPosts(0, 10);
    } catch (error) {
      alert("게시글 작성에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 이미지 선택 처리
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 검증 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        alert("이미지 크기는 5MB 이하여야 합니다.");
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
            <ProfileImage
              imageUrl={profileUser?.profileImgUrl}
              username={profileUser?.username || ""}
              size="md"
              className="new-post-avatar"
            />
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
          {feedPosts.map((post: any) => {
            return (
              <article key={post.id} className="post-card">
                <div className="post-content">
                  <ProfileImage
                    imageUrl={post.authorProfileImg}
                    username={post.authorUsername}
                    size="md"
                    className="post-avatar"
                  />
                  <div className="post-main-content">
                    <div className="post-header">
                      <span className="post-username">
                        @{post.authorUsername}
                      </span>
                      <time
                        className="post-timestamp"
                        dateTime={post.createdAt}
                      >
                        {formatTimeAgo(post.createdAt)}
                      </time>
                    </div>

                    <div className="post-text-content">
                      <p className="post-text">{post.content}</p>
                      {/* 이미지가 있는 경우 표시 */}
                      {post.imgUrl && (
                        <div className="post-image-container mt-3">
                          <img
                            src={post.imgUrl}
                            alt="Post image"
                            className="post-image w-full max-h-96 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>

                    <footer className="post-actions">
                      <div className="post-interaction-buttons">
                        <button className="post-comment-btn" aria-label="댓글">
                          <span>💬</span>
                          <span className="post-interaction-count">0</span>
                        </button>
                        <button
                          onClick={() => handleRepost(post.id)}
                          className={`post-repost-btn ${
                            post.isReposted
                              ? "post-repost-btn-active"
                              : "post-repost-btn-inactive"
                          }`}
                          aria-label="리포스트"
                        >
                          <span>🔄</span>
                          <span className="post-interaction-count">
                            {post.repostCount}
                          </span>
                        </button>
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`post-like-btn ${
                            post.isLiked
                              ? "post-like-btn-active"
                              : "post-like-btn-inactive"
                          }`}
                          aria-label={post.isLiked ? "좋아요 취소" : "좋아요"}
                        >
                          <span>❤️</span>
                          <span className="post-interaction-count">
                            {post.likeCount}
                          </span>
                        </button>
                        <button className="post-share-btn" aria-label="공유">
                          <span>📤</span>
                        </button>
                      </div>
                    </footer>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

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

      {/* 더 보기 버튼 */}
      {hasMore && !loading && (
        <section className="load-more-section">
          <div className="load-more-container">
            <button
              onClick={() => getFeedPosts(feedPosts.length / 10, 10)}
              className="load-more-btn"
              aria-label="더 많은 게시글 보기"
            >
              더 보기
            </button>
          </div>
        </section>
      )}
    </main>
  );
};

export default Home;
