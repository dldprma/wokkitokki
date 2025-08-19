import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../store/hooks";
import ProfileImage from "../../user/components/ProfileImage";
import {
  getPostDetail,
  toggleLike,
  toggleRepost,
  updatePost,
  deletePost,
} from "../api/postApi";
import type { Post, UpdatePostData } from "../type/postTypes";

// PostResponse 타입을 사용하므로 별도 인터페이스 불필요

interface PostDetailProps {
  postId: string | undefined;
}

const PostDetail: React.FC<PostDetailProps> = ({ postId }) => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        const postData = await getPostDetail(postId);
        setPost(postData);
      } catch (error) {
        console.error("게시글을 불러오는데 실패했습니다:", error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  const handleLike = async () => {
    if (!post) return;

    try {
      const result = await toggleLike(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLiked: result.isLiked,
              likeCount: result.likeCount,
            }
          : null
      );
    } catch (error) {
      console.error("좋아요 처리 중 오류 발생:", error);
    }
  };

  const handleRepost = async () => {
    if (!post) return;

    try {
      const result = await toggleRepost(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isReposted: result.isReposted,
              repostCount: result.repostCount,
            }
          : null
      );
    } catch (error) {
      console.error("리포스트 처리 중 오류 발생:", error);
    }
  };

  // 수정 모드 시작
  const handleEditStart = () => {
    if (!post) return;
    setEditContent(post.content);
    setEditImagePreview(post.imgUrl || null);
    setEditImage(null);
    setIsEditing(true);
  };

  // 수정 취소
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent("");
    setEditImage(null);
    setEditImagePreview(null);
  };

  // 이미지 선택
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEditImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 이미지 제거
  const handleImageRemove = () => {
    setEditImage(null);
    setEditImagePreview(null);
  };

  // 게시글 수정
  const handleEditSubmit = async () => {
    if (!post || !editContent.trim()) return;

    try {
      setEditLoading(true);

      let imageUrl: string | File | undefined = post.imgUrl; // 기본값은 기존 이미지

      // 새 이미지가 있으면 File 객체로 설정
      if (editImage) {
        imageUrl = editImage;
      } else if (editImagePreview === null) {
        // 이미지가 제거된 경우
        imageUrl = undefined;
      }

      const updateData: UpdatePostData = {
        content: editContent.trim(),
        imgUrl: imageUrl,
      };

      const updatedPost = await updatePost(post.id, updateData);
      setPost(updatedPost);
      setIsEditing(false);
      setEditContent("");
      setEditImage(null);
      setEditImagePreview(null);
    } catch (error) {
      console.error("게시글 수정 중 오류 발생:", error);
      alert(
        error instanceof Error ? error.message : "게시글 수정에 실패했습니다."
      );
    } finally {
      setEditLoading(false);
    }
  };

  // 게시글 삭제
  const handleDelete = async () => {
    if (!post) return;

    if (!window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      setDeleteLoading(true);
      await deletePost(post.id);
      navigate(-1); // 이전 페이지로 돌아가기
    } catch (error) {
      console.error("게시글 삭제 중 오류 발생:", error);
    } finally {
      setDeleteLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            게시글을 찾을 수 없습니다
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 삭제된 게시글인 경우
  if (post.deleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            삭제된 게시글입니다
          </h1>
          <p className="text-gray-600 mb-6">
            이 게시글은 작성자에 의해 삭제되었습니다.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
        >
          ← 이전 페이지로 돌아가기
        </button>

        {/* 게시글 상세 */}
        <article className="bg-white rounded-lg shadow-sm p-6">
          {/* 작성자 정보 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div
                className="cursor-pointer hover:opacity-80"
                onClick={() => handleUserClick(post.authorUsername)}
              >
                <ProfileImage
                  imageUrl={post.authorProfileImg}
                  username={post.authorUsername}
                  size="lg"
                  className="w-12 h-12"
                />
              </div>
              <div
                className="cursor-pointer hover:opacity-80"
                onClick={() => handleUserClick(post.authorUsername)}
              >
                <div className="font-semibold text-gray-900">
                  {post.authorName}
                </div>
                <div className="text-gray-500">@{post.authorUsername}</div>
              </div>
            </div>

            {/* 오른쪽: 시간과 수정/삭제 버튼 */}
            <div className="flex items-center space-x-3">
              <span className="text-gray-500 text-sm">
                {formatTimeAgo(post.createdAt)}
              </span>

              {/* 내가 쓴 게시글이면 수정/삭제 버튼 표시 */}
              {user?.username === post.authorUsername && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleEditStart}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 게시글 내용 */}
          <div className="mb-6">
            {isEditing ? (
              <div className="space-y-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="게시글 내용을 입력하세요..."
                />

                {/* 이미지 업로드 영역 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      이미지 선택
                    </label>
                    {editImagePreview && (
                      <button
                        onClick={handleImageRemove}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        이미지 제거
                      </button>
                    )}
                  </div>

                  {/* 이미지 미리보기 */}
                  {editImagePreview && (
                    <div className="relative">
                      <img
                        src={editImagePreview}
                        alt="미리보기"
                        className="w-full max-h-64 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleEditSubmit}
                    disabled={editLoading || !editContent.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? "수정 중..." : "수정 완료"}
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-900 text-lg leading-relaxed">
                  {post.content}
                </p>
                {post.imgUrl && (
                  <div className="mt-4">
                    <img
                      src={post.imgUrl}
                      alt="Post image"
                      className="w-full max-h-96 object-cover rounded-lg"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* 상호작용 버튼 */}
          <div className="flex items-center space-x-6 text-gray-500">
            <button className="flex items-center space-x-2 hover:text-blue-500">
              <span>💬</span>
              <span>댓글</span>
            </button>
            <button
              className={`flex items-center space-x-2 transition-colors ${
                post.isReposted ? "text-green-500" : "hover:text-green-500"
              }`}
              onClick={handleRepost}
            >
              <span>🔄</span>
              <span>{post.repostCount}</span>
            </button>
            <button
              className={`flex items-center space-x-2 transition-colors ${
                post.isLiked ? "text-red-500" : "hover:text-red-500"
              }`}
              onClick={handleLike}
            >
              <span>❤️</span>
              <span>{post.likeCount}</span>
            </button>
            <button className="flex items-center space-x-2 hover:text-blue-500">
              <span>📤</span>
              <span>공유</span>
            </button>
          </div>
        </article>
      </div>
    </div>
  );
};

export default PostDetail;
