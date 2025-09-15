import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { toggleLike, toggleRepost, removeComment } from "../store/commentSlice";
import CommentComposer from "./CommentComposer";
import UserSelectModal from "../../message/components/UserSelectModal";
import type { Comment } from "../type/commentTypes";
import "../../../css/comment.css";

interface CommentItemProps {
  comment: Comment;
  postId: number;
  onReplySuccess?: () => void;
  onEditSuccess?: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  onReplySuccess,
  onEditSuccess,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const [selectedCommentForShare, setSelectedCommentForShare] =
    useState<any>(null);

  // 댓글 상태를 로컬로 관리 (UI 즉시 반영용)
  const [localIsLiked, setLocalIsLiked] = useState(comment.liked || false);
  const [localLikeCount, setLocalLikeCount] = useState(comment.likeCount || 0);
  const [localIsReposted, setLocalIsReposted] = useState(
    comment.reposted || false
  );
  const [localRepostCount, setLocalRepostCount] = useState(
    comment.repostCount || 0
  );

  // username으로 댓글 작성자 비교
  const isMyComment = user?.username === comment.authorUsername;

  // 댓글 상태가 변경될 때마다 로컬 상태 동기화
  useEffect(() => {
    setLocalIsLiked(comment.liked || false);
    setLocalLikeCount(comment.likeCount || 0);
    setLocalIsReposted(comment.reposted || false);
    setLocalRepostCount(comment.repostCount || 0);
  }, [comment.liked, comment.likeCount, comment.reposted, comment.repostCount]);

  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  const handleCommentClick = () => {
    navigate(`/comment/${comment.id}`);
  };

  const handleLike = async () => {
    if (!user) return;
    try {
      const result = await dispatch(toggleLike(comment.id)).unwrap();

      // 로컬 상태 즉시 업데이트 (UI 반응성 향상)
      setLocalIsLiked(result.liked);
      setLocalLikeCount(result.likeCount);
    } catch (error) {
      console.error("댓글 좋아요 실패:", error);
    }
  };

  const handleRepost = async () => {
    if (!user) return;
    try {
      const result = await dispatch(toggleRepost(comment.id)).unwrap();

      // 로컬 상태 즉시 업데이트 (UI 반응성 향상)
      setLocalIsReposted(result.reposted);
      setLocalRepostCount(result.repostCount);
    } catch (error) {
      console.error("댓글 리포스트 실패:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await dispatch(removeComment(comment.id)).unwrap();
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "방금 전";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}시간 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="comment-item">
      {/* 삭제된 댓글인 경우 */}
      {comment.deleted ? (
        <div className="text-gray-500 italic text-center py-4">
          <p className="text-sm">삭제된 댓글입니다</p>
        </div>
      ) : (
        <>
          {/* 리포스트 정보 표시 */}
          {comment.repostedBy && (
            <div className="repost-info text-sm text-gray-500 mb-2">
              🔄 {comment.repostedBy}님이 리포스트했습니다
            </div>
          )}
          {/* 댓글 헤더 */}
          <div className="comment-item-header">
            <div className="comment-item-author">
              <img
                src={comment.authorProfileImg || "/default-avatar.png"}
                alt={comment.authorName}
                className="comment-item-avatar cursor-pointer hover:opacity-80"
                onClick={() => handleUserClick(comment.authorUsername)}
              />
              <div className="comment-item-author-info">
                <span
                  className="comment-item-author-name cursor-pointer hover:underline"
                  onClick={() => handleUserClick(comment.authorUsername)}
                >
                  {comment.authorName}
                </span>
                <span
                  className="comment-item-author-username cursor-pointer hover:underline"
                  onClick={() => handleUserClick(comment.authorUsername)}
                >
                  @{comment.authorUsername}
                </span>
                <span className="comment-item-time">
                  {formatTime(comment.createdAt)}
                </span>
              </div>
            </div>

            {/* 내 댓글이면 점 세 개 메뉴 */}
            {isMyComment && (
              <div className="comment-item-menu">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="comment-item-menu-btn"
                  aria-label="메뉴"
                >
                  ⋯
                </button>

                {isMenuOpen && (
                  <div className="comment-item-dropdown">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setIsMenuOpen(false);
                      }}
                      className="comment-item-menu-option edit"
                    >
                      ✏️ 수정하기
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                        setIsMenuOpen(false);
                      }}
                      className="comment-item-menu-option delete"
                    >
                      🗑️ 삭제하기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 댓글 내용 */}
          {isEditing ? (
            <CommentComposer
              postId={postId}
              commentToEdit={comment}
              onSuccess={() => {
                setIsEditing(false);
                onEditSuccess?.();
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div
              className="comment-item-content cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              onClick={handleCommentClick}
            >
              {comment.content}

              {/* 댓글 이미지 표시 */}
              {comment.imageUrl && (
                <div className="mt-3">
                  <img
                    src={comment.imageUrl}
                    alt="댓글 이미지"
                    className="max-w-full max-h-64 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 댓글 액션바 */}
          <div className="comment-item-actions">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="comment-item-action-btn reply"
              aria-label="답글"
            >
              💬 {comment.replyCount > 0 && formatCount(comment.replyCount)}
            </button>

            <button
              onClick={handleRepost}
              className={`comment-item-action-btn repost ${
                localIsReposted ? "active" : ""
              }`}
              aria-label="리포스트"
            >
              {localIsReposted ? "↪️" : "🔄"}{" "}
              {localRepostCount > 0 && formatCount(localRepostCount)}
            </button>

            <button
              onClick={handleLike}
              className={`comment-item-action-btn like ${
                localIsLiked ? "active" : ""
              }`}
              aria-label="좋아요"
            >
              {localIsLiked ? "❤️" : "🤍"}{" "}
              {localLikeCount > 0 && formatCount(localLikeCount)}
            </button>

            {/* DM 버튼 */}
            <button
              onClick={() => {
                setSelectedCommentForShare({
                  type: "dirctmessage",
                  content: comment.content,
                  imageUrl: comment.imageUrl,
                  authorName: comment.authorName,
                  postId: postId.toString(),
                });
                setShowUserSelectModal(true);
              }}
              className="comment-item-action-btn dm"
              aria-label="메시지 보내기"
            >
              📤
            </button>
          </div>

          {/* 답글 작성 폼 */}
          {isReplying && (
            <div className="comment-item-reply-form">
              <CommentComposer
                postId={postId}
                parentCommentId={comment.id}
                onSuccess={() => {
                  setIsReplying(false);
                  onReplySuccess?.();
                }}
                onCancel={() => setIsReplying(false)}
                placeholder={`@${comment.authorUsername}에게 답글 달기`}
              />
            </div>
          )}

          {/* 대댓글 목록 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="comment-item-replies">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onReplySuccess={onReplySuccess}
                  onEditSuccess={onEditSuccess}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* 사용자 선택 모달 */}
      <UserSelectModal
        isOpen={showUserSelectModal}
        onClose={() => {
          setShowUserSelectModal(false);
          setSelectedCommentForShare(null);
        }}
        shareContent={selectedCommentForShare}
      />
    </div>
  );
};

export default CommentItem;
