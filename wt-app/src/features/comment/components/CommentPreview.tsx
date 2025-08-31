import React from "react";
import { useNavigate } from "react-router-dom";
import type { Comment } from "../type/commentTypes";
import "../../../css/comment.css";

interface CommentPreviewProps {
  comments: Comment[];
  postId: number;
  maxComments?: number;
}

const CommentPreview: React.FC<CommentPreviewProps> = ({
  comments,
  postId,
  maxComments = 2,
}) => {
  const navigate = useNavigate();

  if (!comments || comments.length === 0) {
    return null;
  }

  const visibleComments = comments.slice(0, maxComments);
  const hasMoreComments = comments.length > maxComments;

  const handleViewAllComments = () => {
    navigate(`/post/${postId}`);
  };

  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="comment-preview">
      {/* 연결선 시작 */}
      <div className="comment-preview-connector">
        <div className="comment-preview-connector-line"></div>
      </div>

      {visibleComments.map((comment, index) => (
        <div key={comment.id} className="comment-preview-item">
          {/* 댓글 연결선 */}
          <div className="comment-preview-item-connector">
            <div className="comment-preview-item-line"></div>
          </div>

          {/* 댓글을 게시글과 동일한 카드 스타일로 표시 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-start space-x-3 mb-3">
              <img
                src={comment.authorProfileImg || "/default-avatar.png"}
                alt={comment.authorName}
                className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleUserClick(comment.authorUsername)}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-gray-900 cursor-pointer hover:underline">
                    {comment.authorName}
                  </span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500 text-sm">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-gray-500 cursor-pointer hover:underline">
                  @{comment.authorUsername}
                </span>
              </div>
            </div>
            
            <div className="text-gray-900 mb-3 leading-relaxed">
              {comment.content}
            </div>
            
            {comment.imageUrl && (
              <div className="mb-3">
                <img
                  src={comment.imageUrl}
                  alt="댓글 이미지"
                  className="w-full max-h-80 object-cover rounded-lg"
                />
              </div>
            )}

            {/* 댓글 액션 버튼 - 게시글과 동일한 스타일 */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-6">
                {/* 답글 */}
                <span className="flex items-center space-x-2 text-gray-500">
                  <span>💬</span>
                  <span>{comment.replyCount > 0 ? formatCount(comment.replyCount) : '0'}</span>
                </span>

                {/* 리포스트 */}
                <span className="flex items-center space-x-2 text-gray-500">
                  <span>🔄</span>
                  <span>{comment.repostCount > 0 ? formatCount(comment.repostCount) : '0'}</span>
                </span>

                {/* 좋아요 */}
                <span className="flex items-center space-x-2 text-gray-500">
                  <span>🤍</span>
                  <span>{comment.likeCount > 0 ? formatCount(comment.likeCount) : '0'}</span>
                </span>

                {/* DM */}
                <button
                  onClick={() => handleUserClick(comment.authorUsername)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <span>📩</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {hasMoreComments && (
        <button
          onClick={handleViewAllComments}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          댓글 {comments.length}개 모두 보기
        </button>
      )}
    </div>
  );
};

export default CommentPreview;
