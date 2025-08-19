import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileImage from "../../user/components/ProfileImage";
import { getPostDetail } from "../api/postApi";
import type { Post } from "../type/postTypes";

// PostResponse 타입을 사용하므로 별도 인터페이스 불필요

interface PostDetailProps {
  postId: string | undefined;
}

const PostDetail: React.FC<PostDetailProps> = ({ postId }) => {
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

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
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            홈으로 돌아가기
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
          onClick={() => navigate("/")}
          className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
        >
          ← 홈으로 돌아가기
        </button>

        {/* 게시글 상세 */}
        <article className="bg-white rounded-lg shadow-sm p-6">
          {/* 작성자 정보 */}
          <div className="flex items-center space-x-3 mb-4">
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
            <div className="ml-auto text-gray-500 text-sm">
              {formatTimeAgo(post.createdAt)}
            </div>
          </div>

          {/* 게시글 내용 */}
          <div className="mb-6">
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
          </div>

          {/* 상호작용 버튼 */}
          <div className="flex items-center space-x-6 text-gray-500">
            <button className="flex items-center space-x-2 hover:text-blue-500">
              <span>💬</span>
              <span>댓글</span>
            </button>
            <button className="flex items-center space-x-2 hover:text-green-500">
              <span>🔄</span>
              <span>{post.repostCount}</span>
            </button>
            <button className="flex items-center space-x-2 hover:text-red-500">
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
