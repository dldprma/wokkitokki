import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { getPostDetail } from "../../post/api/postApi";
import { getCommentDetail } from "../api/commentApi";
import {
  togglePostLike,
  togglePostRepostFromDetail,
} from "../../home/store/homeSlice";
import CommentItem from "./CommentItem";
import type { Comment } from "../type/commentTypes";
import type { Post } from "../../post/type/postTypes";
import "../../../css/comment.css";

interface CommentDetailProps {
  commentId: number;
}

const CommentDetail: React.FC<CommentDetailProps> = ({ commentId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [comment, setComment] = useState<Comment | null>(null);
  const [originalPost, setOriginalPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // 댓글과 원글 정보 조회
  const fetchCommentDetail = useCallback(async () => {
    try {
      setLoading(true);

      // 1. 댓글 상세 조회 (commentApi 사용)
      const commentDetailData = await getCommentDetail(commentId);

      // CommentDetailResponseDto 구조에 맞게 처리
      const commentResponse = commentDetailData.comment;
      const repliesData = commentDetailData.replies || [];

      // 2. 원글 정보 조회
      const post = await getPostDetail(commentResponse.postId.toString());
      setOriginalPost(post);

      // 3. 선택된 댓글 정보 설정
      setComment(commentResponse);

      // 4. 대댓글 목록 설정 (이미 API 응답에 포함됨)
      setReplies(repliesData);

      // 5. 현재 사용자 정보를 기반으로 댓글 상태 업데이트
      if (user) {
        const updatedComment = {
          ...commentResponse,
          liked: commentResponse.liked || false,
          reposted: commentResponse.reposted || false,
          deleted: commentResponse.deleted || false, // deleted 필드 추가
        };
        setComment(updatedComment);

        // 모든 대댓글 표시 (삭제 여부와 관계없이)
        const updatedReplies = repliesData.map((reply: Comment) => ({
          ...reply,
          liked: reply.liked || false,
          reposted: reply.reposted || false,
          deleted: reply.deleted || false, // deleted 필드 추가
        }));
        setReplies(updatedReplies);
      } else {
        setComment(commentResponse);
        // 모든 대댓글 표시 (삭제 여부와 관계없이)
        setReplies(repliesData);
      }
    } catch (error: any) {
      console.error("댓글 상세 정보 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [commentId]);

  useEffect(() => {
    fetchCommentDetail();
  }, [fetchCommentDetail]);

  const handleBackToPost = () => {
    if (originalPost) {
      navigate(`/post/${originalPost.id}`);
    }
  };

  const handleReplySuccess = () => {
    // 대댓글 작성 성공 시 댓글 상세 조회 API를 다시 호출하여 최신 상태 반영
    if (comment) {
      fetchCommentDetail();
    }
  };

  // 원본 게시글 좋아요 토글
  const handlePostLike = async () => {
    if (!originalPost) return;

    try {
      const result = await dispatch(togglePostLike(originalPost.id)).unwrap();

      // 로컬 상태 업데이트
      setOriginalPost((prev) =>
        prev
          ? {
              ...prev,
              liked: result.liked,
              likeCount: result.likeCount,
            }
          : null
      );
    } catch (error) {
      console.error("원본 게시글 좋아요 실패:", error);
    }
  };

  // 원본 게시글 리포스트 토글
  const handlePostRepost = async () => {
    if (!originalPost) return;

    try {
      const result = await dispatch(
        togglePostRepostFromDetail({
          postId: originalPost.id,
          postData: originalPost,
        })
      ).unwrap();

      // 로컬 상태 업데이트
      setOriginalPost((prev) =>
        prev
          ? {
              ...prev,
              reposted: result.isReposted,
              repostCount: result.repostCount,
            }
          : null
      );
    } catch (error) {
      console.error("원본 게시글 리포스트 실패:", error);
    }
  };

  if (loading) {
    return (
      <div className="comment-detail-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">댓글을 불러오는 중...</p>
      </div>
    );
  }

  if (!comment || !originalPost) {
    return (
      <div className="comment-detail-error">
        <p className="text-center text-red-500">댓글을 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl py-8 px-6 ml-8">
      {/* 뒤로 가기 버튼 */}
      <div className="mb-6">
        <button
          onClick={handleBackToPost}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="text-xl mr-2">←</span>
          <span>게시글로 돌아가기</span>
        </button>
      </div>

      {/* 원글 (게시글) */}
      <div className="mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-start space-x-3 mb-4">
              <img
                src={
                  originalPost.authorProfileImg ||
                  "https://via.placeholder.com/48x48/e1e8ed/536471?text=👤"
                }
                alt={originalPost.authorName}
                className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/${originalPost.authorUsername}`)}
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/48x48/e1e8ed/536471?text=👤";
                }}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span
                    className="font-semibold text-gray-900 cursor-pointer hover:underline"
                    onClick={() => navigate(`/${originalPost.authorUsername}`)}
                  >
                    {originalPost.authorName}
                  </span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500">
                    {new Date(originalPost.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className="text-gray-500 cursor-pointer hover:underline"
                  onClick={() => navigate(`/${originalPost.authorUsername}`)}
                >
                  @{originalPost.authorUsername}
                </span>
              </div>
            </div>

            <div className="text-gray-900 text-lg leading-relaxed mb-4">
              {originalPost.content}
            </div>

            {originalPost.imgUrl && (
              <div className="mb-4">
                <img
                  src={originalPost.imgUrl}
                  alt="Post image"
                  className="w-full max-h-96 object-cover rounded-xl"
                />
              </div>
            )}

            {/* 원본 게시글 액션 버튼 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-8">
                {/* 댓글 */}
                <span className="flex items-center space-x-2 text-gray-500">
                  <span>💬</span>
                  <span>{originalPost.commentCount || 0}</span>
                </span>

                {/* 리포스트 */}
                <button
                  onClick={handlePostRepost}
                  className={`flex items-center space-x-2 transition-colors ${
                    originalPost.reposted
                      ? "text-green-500"
                      : "text-gray-500 hover:text-green-500"
                  }`}
                  aria-label="리포스트"
                >
                  <span>{originalPost.reposted ? "↪️" : "🔄"}</span>
                  <span>
                    {originalPost.repostCount > 0 && originalPost.repostCount}
                  </span>
                </button>

                {/* 좋아요 */}
                <button
                  onClick={handlePostLike}
                  className={`flex items-center space-x-2 transition-colors ${
                    originalPost.liked
                      ? "text-red-500"
                      : "text-gray-500 hover:text-red-500"
                  }`}
                  aria-label="좋아요"
                >
                  <span>{originalPost.liked ? "❤️" : "🤍"}</span>
                  <span>
                    {originalPost.likeCount > 0 && originalPost.likeCount}
                  </span>
                </button>

                {/* DM */}
                <button
                  onClick={() => navigate(`/dm/${originalPost.authorUsername}`)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                  aria-label="DM 보내기"
                >
                  <span>📩</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 선택된 댓글 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2">
          선택된 댓글
        </h3>
        <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
          <div className="p-4">
            {comment && comment.deleted ? (
              // 삭제된 댓글 표시
              <div className="text-gray-500 italic text-center py-4">
                <p className="text-sm">삭제된 댓글입니다</p>
              </div>
            ) : (
              // 정상 댓글 표시
              <CommentItem
                comment={comment}
                postId={comment.postId}
                onReplySuccess={handleReplySuccess}
                onEditSuccess={handleReplySuccess}
              />
            )}
          </div>
        </div>
      </div>

      {/* 대댓글 목록 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2">
          답글 ({replies.length}개)
        </h3>
        {replies.length > 0 ? (
          <div className="space-y-4">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm"
              >
                <div className="p-4">
                  <CommentItem
                    comment={reply}
                    postId={comment.postId}
                    onReplySuccess={handleReplySuccess}
                    onEditSuccess={handleReplySuccess}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">
              아직 답글이 없습니다. 첫 번째 답글을 작성해보세요!
            </p>
            <div className="text-center">
              <button
                onClick={() => {
                  // 답글 작성 폼을 여는 로직 (나중에 구현)
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                답글 작성하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentDetail;
