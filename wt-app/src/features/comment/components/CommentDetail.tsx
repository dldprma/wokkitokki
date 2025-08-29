import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../store/hooks";

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
      console.log("댓글 상세 조회 결과:", commentDetailData);

      // CommentDetailResponseDto 구조에 맞게 처리
      const commentResponse = commentDetailData.comment;
      const repliesData = commentDetailData.replies || [];

      // 2. 원글 정보 조회
      const post = await getPostDetail(commentResponse.postId.toString());
      console.log("원글 정보:", post);
      console.log("작성자 프로필 이미지 URL:", post.authorProfileImg);
      setOriginalPost(post);

      // 3. 선택된 댓글 정보 설정
      setComment(commentResponse);

      // 4. 대댓글 목록 설정 (이미 API 응답에 포함됨)
      setReplies(repliesData);
    } catch (error) {
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
    // 대댓글 작성 성공 시 대댓글 목록 새로고침
    if (comment) {
      // 댓글 상세 조회 API를 다시 호출하여 최신 상태 반영
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
    <div className="comment-detail">
      {/* 뒤로 가기 버튼 */}
      <div className="comment-detail-header">
        <button onClick={handleBackToPost} className="comment-detail-back-btn">
          ← 게시글로 돌아가기
        </button>
      </div>

      {/* 원글 (게시글) */}
      <div className="comment-detail-original-post">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          원본 게시글
        </h3>
        <div className="post-item bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="post-header flex items-center space-x-3 mb-3">
            <img
              src={
                originalPost.authorProfileImg ||
                "https://via.placeholder.com/48x48/e1e8ed/536471?text=👤"
              }
              alt={originalPost.authorName}
              className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80"
              onClick={() => navigate(`/${originalPost.authorUsername}`)}
              onError={(e) => {
                e.currentTarget.src =
                  "https://via.placeholder.com/48x48/e1e8ed/536471?text=👤";
              }}
            />
            <div className="post-author-info">
              <span
                className="post-author-name font-semibold text-gray-900 cursor-pointer hover:underline block"
                onClick={() => navigate(`/${originalPost.authorUsername}`)}
              >
                {originalPost.authorName}
              </span>
              <span
                className="post-author-username text-gray-500 cursor-pointer hover:underline block"
                onClick={() => navigate(`/${originalPost.authorUsername}`)}
              >
                @{originalPost.authorUsername}
              </span>
            </div>
          </div>
          <div className="post-content text-gray-800 mb-3">
            {originalPost.content}
          </div>
          {originalPost.imgUrl && (
            <div className="post-image mb-3">
              <img
                src={originalPost.imgUrl}
                alt="Post image"
                className="w-full max-h-96 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="comment-item-actions">
            {/* 댓글 */}
            <span className="comment-item-action-btn text-gray-500">
              💬 {originalPost.commentCount || 0}
            </span>

            {/* 리포스트 */}
            <button
              onClick={handlePostRepost}
              className={`comment-item-action-btn repost ${
                originalPost.reposted ? "active" : ""
              }`}
              aria-label="리포스트"
            >
              {originalPost.reposted ? "↪️" : "🔄"}{" "}
              {originalPost.repostCount > 0 && originalPost.repostCount}
            </button>

            {/* 좋아요 */}
            <button
              onClick={handlePostLike}
              className={`comment-item-action-btn like ${
                originalPost.liked ? "active" : ""
              }`}
              aria-label="좋아요"
            >
              {originalPost.liked ? "❤️" : "🤍"}{" "}
              {originalPost.likeCount > 0 && originalPost.likeCount}
            </button>

            {/* DM */}
            <button
              onClick={() => navigate(`/dm/${originalPost.authorUsername}`)}
              className="comment-item-action-btn dm"
              aria-label="DM 보내기"
            >
              📩
            </button>
          </div>
        </div>
      </div>

      {/* 선택된 댓글 */}
      <div className="comment-detail-selected-comment">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          선택된 댓글
        </h3>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <CommentItem
            comment={comment}
            postId={comment.postId}
            onReplySuccess={handleReplySuccess}
            onEditSuccess={handleReplySuccess}
          />
        </div>
      </div>

      {/* 대댓글 목록 */}
      <div className="comment-detail-replies">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          답글 ({replies.length}개)
        </h3>
        {replies.length > 0 ? (
          <div className="space-y-4">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <CommentItem
                  comment={reply}
                  postId={comment.postId}
                  onReplySuccess={handleReplySuccess}
                  onEditSuccess={handleReplySuccess}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="comment-no-replies bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">
              아직 답글이 없습니다. 첫 번째 답글을 작성해보세요!
            </p>
            <div className="text-center">
              <button
                onClick={() => {
                  // 답글 작성 폼을 여는 로직 (나중에 구현)
                  console.log("답글 작성 폼 열기");
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
