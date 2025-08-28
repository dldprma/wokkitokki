import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../store/hooks";
import { fetchCommentById, fetchRepliesByComment } from "../store/commentSlice";
import { getPostDetail } from "../../post/api/postApi";
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
  useEffect(() => {
    const fetchCommentDetail = async () => {
      try {
        setLoading(true);

        // 1. 단일 댓글 정보 조회
        const commentResponse = await dispatch(
          fetchCommentById(commentId)
        ).unwrap();

        // 2. 원글 정보 조회
        const post = await getPostDetail(commentResponse.postId);
        console.log("원글 정보:", post);
        console.log("작성자 프로필 이미지 URL:", post.authorProfileImg);
        setOriginalPost(post);

        // 3. 선택된 댓글 정보 설정
        setComment(commentResponse);

        // 4. 대댓글 목록 조회
        try {
          const repliesResponse = await dispatch(
            fetchRepliesByComment({ commentId, page: 0 })
          ).unwrap();
          setReplies(repliesResponse.content);
        } catch (repliesError) {
          console.log("대댓글이 없거나 조회 실패:", repliesError);
          setReplies([]); // 대댓글이 없으면 빈 배열
        }
      } catch (error) {
        console.error("댓글 상세 정보 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommentDetail();
  }, [commentId, dispatch]);

  const handleBackToPost = () => {
    if (originalPost) {
      navigate(`/post/${originalPost.id}`);
    }
  };

  const handleReplySuccess = () => {
    // 대댓글 작성 성공 시 대댓글 목록 새로고침
    if (comment) {
      dispatch(fetchRepliesByComment({ commentId: comment.id, page: 0 }));
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
        <div className="post-item">
          <div className="post-header">
            <img
              src={
                originalPost.authorProfileImg ||
                "https://via.placeholder.com/48x48/e1e8ed/536471?text=👤"
              }
              alt={originalPost.authorName}
              className="post-avatar cursor-pointer hover:opacity-80"
              onClick={() => navigate(`/${originalPost.authorUsername}`)}
              onError={(e) => {
                e.currentTarget.src =
                  "https://via.placeholder.com/48x48/e1e8ed/536471?text=👤";
              }}
            />
            <div className="post-author-info">
              <span
                className="post-author-name cursor-pointer hover:underline"
                onClick={() => navigate(`/${originalPost.authorUsername}`)}
              >
                {originalPost.authorName}
              </span>
              <span
                className="post-author-username cursor-pointer hover:underline"
                onClick={() => navigate(`/${originalPost.authorUsername}`)}
              >
                @{originalPost.authorUsername}
              </span>
            </div>
          </div>
          <div className="post-content">{originalPost.content}</div>
          {originalPost.imgUrl && (
            <div className="post-image">
              <img
                src={originalPost.imgUrl}
                alt="Post image"
                className="w-full max-h-96 object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* 선택된 댓글 */}
      <div className="comment-detail-selected-comment">
        <CommentItem
          comment={comment}
          postId={comment.postId}
          onReplySuccess={handleReplySuccess}
          onEditSuccess={handleReplySuccess}
        />
      </div>

      {/* 대댓글 목록 */}
      <div className="comment-detail-replies">
        <h3 className="comment-replies-title">답글</h3>
        {replies.length > 0 ? (
          replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={comment.postId}
              onReplySuccess={handleReplySuccess}
              onEditSuccess={handleReplySuccess}
            />
          ))
        ) : (
          <div className="comment-no-replies">
            <p className="text-gray-500 text-center py-8">
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
