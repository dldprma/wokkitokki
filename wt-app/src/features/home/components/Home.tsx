import React, { useState, useEffect } from "react";
import { useHome } from "../hooks/useHome";
import { useUser } from "../../user/hooks/useUser";
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
    posts,
    loading,
    error,
    hasMore,
    getPosts,
    createPost,
    toggleLike,
    toggleRepost,
  } = useHome();
  const { user: profileUser } = useUser();
  const [newPostContent, setNewPostContent] = useState("");

  useEffect(() => {
    if (isInitialized && isAuthenticated && !authLoading) {
      getPosts(0, 10);
    }
  }, [isInitialized, isAuthenticated, authLoading]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    try {
      await createPost({ content: newPostContent });
      setNewPostContent("");
    } catch (error) {
      console.error("게시글 작성 실패:", error);
    }
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
              imageUrl={profileUser?.profileImage}
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
              <div className="new-post-actions">
                <div className="new-post-media-buttons">
                  <button className="new-post-media-btn" aria-label="사진 첨부">
                    📷
                  </button>
                  <button
                    className="new-post-media-btn"
                    aria-label="동영상 첨부"
                  >
                    🎬
                  </button>
                  <button className="new-post-media-btn" aria-label="이모티콘">
                    😊
                  </button>
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim()}
                  className="new-post-submit-btn"
                  aria-label="게시글 작성"
                >
                  게시하기
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* 게시글 목록 */}
      <section className="posts-section">
        <div className="posts-container">
          {posts.map((post) => {
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
              onClick={() => getPosts(posts.length / 10, 10)}
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
