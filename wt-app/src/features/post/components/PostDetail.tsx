import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import ProfileImage from "../../user/components/ProfileImage";
import { CommentList } from "../../comment";
import Nav from "../../home/components/Nav";
import { getPostDetail, updatePost, deletePost } from "../api/postApi";
import {
  togglePostLike,
  togglePostRepostFromDetail,
} from "../../home/store/homeSlice";
import type { Post } from "../type/postTypes";

// PostResponse 타입을 사용하므로 별도 인터페이스 불필요

interface PostDetailProps {
  postId: string | undefined;
}

const PostDetail: React.FC<PostDetailProps> = ({ postId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);

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

  // 메뉴 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".menu-container")) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  // 스마트 뒤로가기: 어디서 왔는지에 따라 적절한 곳으로 이동
  const handleGoBack = () => {
    // location.state에서 이전 페이지 정보 확인
    const from = location.state?.from;

    if (from) {
      // 명시적으로 전달된 이전 페이지가 있으면 그곳으로 이동
      navigate(from);
    } else {
      // 기본적으로 홈으로 이동
      navigate("/");
    }
  };

  const handleLike = async () => {
    if (!post) return;

    try {
      const result = await dispatch(togglePostLike(post.id)).unwrap();

      // 로컬 상태도 업데이트
      setPost((prev) =>
        prev
          ? {
              ...prev,
              liked: result.liked,
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
      console.log("리포스트 시작 - 현재 post 상태:", post);

      const result = await dispatch(
        togglePostRepostFromDetail({
          postId: post.id,
          postData: post,
        })
      ).unwrap();

      console.log("리포스트 결과:", result);

      // 로컬 상태도 업데이트
      setPost((prev) => {
        const updatedPost = prev
          ? {
              ...prev,
              reposted: result.isReposted,
              repostCount: result.repostCount,
              // 리포스트된 경우 현재 사용자명을 repostedBy에 설정
              repostedBy: result.isReposted ? user?.username : null,
            }
          : null;

        console.log("업데이트된 post 상태:", updatedPost);
        return updatedPost;
      });
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
    <div className="flex min-h-screen bg-gray-50">
      <Nav />
      <div className="flex-1 ml-64">
        <div className="max-w-2xl py-8 px-6 ml-8">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={handleGoBack}
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

              {/* 오른쪽: 시간과 점 세 개 메뉴 */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-500 text-sm">
                  {formatTimeAgo(post.createdAt)}
                </span>

                {/* 내가 쓴 게시글이면 점 세 개 메뉴 표시 */}
                {user?.username === post.authorUsername && (
                  <div className="relative menu-container">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="메뉴"
                    >
                      ⋯
                    </button>

                    {/* 드롭다운 메뉴 */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            handleEditStart();
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 first:rounded-t-lg last:rounded-b-lg last:border-b-0"
                        >
                          ✏️ 수정하기
                        </button>
                        <button
                          onClick={() => {
                            handleDelete();
                            setIsMenuOpen(false);
                          }}
                          disabled={deleteLoading}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 border-b border-gray-100 first:rounded-t-lg last:rounded-b-lg last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🗑️ {deleteLoading ? "삭제 중..." : "삭제하기"}
                        </button>
                      </div>
                    )}
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
              <button
                className="flex items-center space-x-2 transition-colors hover:text-blue-500"
                onClick={() => setShowCommentForm(!showCommentForm)}
              >
                <span>💬</span>
                <span>댓글</span>
              </button>
              <button
                className={`flex items-center space-x-2 transition-colors ${
                  post.reposted ? "text-green-500" : "hover:text-green-500"
                }`}
                onClick={handleRepost}
              >
                <span>{post.reposted ? "↪️" : "🔄"}</span>
                <span>{post.repostCount}</span>
              </button>
              <button
                className={`flex items-center space-x-2 transition-colors ${
                  post.liked ? "text-red-500" : "hover:text-red-500"
                }`}
                onClick={handleLike}
              >
                <span>{post.liked ? "❤️" : "🤍"}</span>
                <span>{post.likeCount}</span>
              </button>
              <button className="flex items-center space-x-2 hover:text-blue-500">
                <span>📤</span>
                <span>공유</span>
              </button>
            </div>
          </article>

          {/* 댓글 섹션 */}
          <div className="mt-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                댓글 {post.commentCount > 0 ? `(${post.commentCount})` : ""}
              </h3>
            </div>
            <CommentList
              postId={post.id}
              showComposer={true}
              showCommentForm={showCommentForm}
              onCommentUpdate={() => {
                // 댓글이 업데이트되면 게시글 정보를 다시 불러옴
                if (postId) {
                  getPostDetail(postId).then(setPost).catch(console.error);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
