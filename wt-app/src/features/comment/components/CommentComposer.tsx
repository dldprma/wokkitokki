import React, { useState, useEffect } from "react";
import { useAppDispatch } from "../../../store/hooks";
import { addComment, editComment } from "../store/commentSlice";
import { useAuth } from "../../auth/hooks/useAuth";
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
} from "../type/commentTypes";
import "../../../css/comment.css";

interface CommentComposerProps {
  postId: number;
  parentCommentId?: number | null;
  commentToEdit?: Comment | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  maxLength?: number;
  maxLines?: number;
}

const CommentComposer: React.FC<CommentComposerProps> = ({
  postId,
  parentCommentId = null,
  commentToEdit = null,
  onSuccess,
  onCancel,
  placeholder = "댓글을 작성해보세요.",
  maxLength = 500,
  maxLines = 5,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEditing = !!commentToEdit;
  const isReply = !!parentCommentId;

  useEffect(() => {
    if (commentToEdit) {
      setContent(commentToEdit.content);
      setCharCount(commentToEdit.content.length);
    }
  }, [commentToEdit]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxLength) {
      setContent(newContent);
      setCharCount(newContent.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      if (isEditing && commentToEdit) {
        // 댓글 수정
        const updateData: UpdateCommentRequest = {
          content: content.trim(),
        };
        await dispatch(
          editComment({ commentId: commentToEdit.id, data: updateData })
        ).unwrap();
      } else {
        // 새 댓글 작성
        const createData: CreateCommentRequest = {
          content: content.trim(),
          parentCommentId,
        };
        console.log("댓글 작성 요청:", { postId, data: createData });
        await dispatch(addComment({ postId, data: createData })).unwrap();
      }

      setContent("");
      setCharCount(0);
      onSuccess?.();
    } catch (error: any) {
      console.error("댓글 처리 실패:", error);
      if (error.response) {
        console.error("응답 상태:", error.response.status);
        console.error("응답 데이터:", error.response.data);
        console.error("응답 헤더:", error.response.headers);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB 제한
        alert("이미지 크기는 5MB 이하여야 합니다.");
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleCancel = () => {
    setContent("");
    setCharCount(0);
    setSelectedImage(null);
    setImagePreview(null);
    onCancel?.();
  };

  const getPlaceholder = () => {
    if (isEditing) return "댓글을 수정해주세요.";
    if (isReply) return "답글을 작성하세요.";
    return placeholder;
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) return "처리 중...";
    if (isEditing) return "수정 완료";
    if (isReply) return "답글 작성";
    return "댓글 작성";
  };

  const getCharacterLimitClass = () => {
    const ratio = charCount / maxLength;
    if (ratio >= 0.9) return "text-red-500";
    if (ratio >= 0.8) return "text-orange-500";
    return "text-gray-400";
  };

  if (!user) return null;

  return (
    <div className="comment-composer">
      <div className="comment-composer-header">
        <div className="comment-composer-avatar">
          <img
            src={user.profileImgUrl || "/default-avatar.png"}
            alt={user.fullName}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>
        <div className="comment-composer-content">
          <form onSubmit={handleSubmit} className="comment-composer-form">
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder={getPlaceholder()}
              className="comment-composer-textarea"
              rows={Math.min(content.split("\n").length + 1, maxLines)}
              maxLength={maxLength}
            />

            {/* 이미지 첨부 영역 */}
            <div className="comment-composer-image-section">
              {/* 이미지 미리보기 */}
              {imagePreview && (
                <div className="comment-composer-image-preview">
                  <img
                    src={imagePreview}
                    alt="첨부된 이미지"
                    className="comment-composer-preview-img"
                  />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="comment-composer-image-remove"
                    aria-label="이미지 제거"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 이미지 첨부 버튼 */}
              <div className="comment-composer-image-actions">
                <label className="comment-composer-image-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  📷 이미지 첨부
                </label>
              </div>
            </div>

            <div className="comment-composer-footer">
              <div className="comment-composer-char-count">
                <span className={getCharacterLimitClass()}>
                  {charCount}/{maxLength}
                </span>
              </div>

              <div className="comment-composer-actions">
                {onCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="comment-composer-cancel-btn"
                    disabled={isSubmitting}
                  >
                    취소
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!content.trim() || isSubmitting}
                  className="comment-composer-submit-btn"
                >
                  {getSubmitButtonText()}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommentComposer;
