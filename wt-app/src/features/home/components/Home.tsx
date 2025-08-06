import React, { useState, useEffect } from "react";
import { useHome } from "../hooks/useHome";
import { useAuth } from "../../auth/hooks/useAuth";
import ProfileImage from "../../user/components/ProfileImage";
import "../../../css/Home.css";

const Home: React.FC = () => {
  const {
    posts,
    loading,
    error,
    hasMore,
    getPosts,
    createPost,
    likePost,
    unlikePost,
    repost,
    unRepost,
  } = useHome();
  const { user } = useAuth();
  const [newPostContent, setNewPostContent] = useState("");

  useEffect(() => {
    getPosts(0);
  }, []);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    try {
      await createPost({ content: newPostContent });
      setNewPostContent("");
    } catch (error) {
      console.error("게시글 작성 실패:", error);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
    }
  };

  const handleRepost = async (postId: string, isReposted: boolean) => {
    try {
      if (isReposted) {
        await unRepost(postId);
      } else {
        await repost(postId);
      }
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
    <div className="home-container">
      <h1 className="home-title">홈</h1>

      {/* 새 게시글 작성 */}
      <div className="new-post-container">
        <div className="new-post-content">
          <ProfileImage
            imageUrl={user?.profileImage}
            username={user?.username || ""}
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
            />
            <div className="new-post-actions">
              <div className="new-post-media-buttons">
                <button className="new-post-media-btn">📷</button>
                <button className="new-post-media-btn">🎬</button>
                <button className="new-post-media-btn">😊</button>
              </div>
              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim()}
                className="new-post-submit-btn"
              >
                게시하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="posts-container">
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-content">
              <ProfileImage
                imageUrl={post.profileImageUrl}
                username={post.username}
                size="md"
                className="post-avatar"
              />
              <div className="post-main-content">
                <div className="post-header">
                  <span className="post-username">@{post.username}</span>
                  <span className="post-timestamp">
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>
                <p className="post-text">{post.content}</p>

                {/* 상호작용 버튼들 */}
                <div className="post-actions">
                  <div className="post-interaction-buttons">
                    <button className="post-comment-btn">
                      <span>💬</span>
                      <span className="post-interaction-count">
                        {post.comments}
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        handleRepost(post.id, post.isReposted || false)
                      }
                      className={`post-repost-btn ${
                        post.isReposted
                          ? "post-repost-btn-active"
                          : "post-repost-btn-inactive"
                      }`}
                    >
                      <span>🔄</span>
                      <span className="post-interaction-count">
                        {post.reposts}
                      </span>
                    </button>
                    <button
                      onClick={() => handleLike(post.id, post.isLiked || false)}
                      className={`post-like-btn ${
                        post.isLiked
                          ? "post-like-btn-active"
                          : "post-like-btn-inactive"
                      }`}
                    >
                      <span>❤️</span>
                      <span className="post-interaction-count">
                        {post.likes}
                      </span>
                    </button>
                    <button className="post-share-btn">
                      <span>📤</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && <div className="error-message">{error}</div>}

      {/* 더 보기 버튼 */}
      {hasMore && !loading && (
        <div className="load-more-container">
          <button
            onClick={() => getPosts(posts.length / 10)}
            className="load-more-btn"
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
