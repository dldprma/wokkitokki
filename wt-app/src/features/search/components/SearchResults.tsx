import React from "react";
import { useNavigate } from "react-router-dom";
import type { UserSearchResult, PostSearchResult } from "../types/searchTypes";

interface SearchResultsProps {
  users: UserSearchResult[];
  posts: PostSearchResult[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  users,
  posts,
  loading,
  error,
  hasMore,
  onLoadMore,
}) => {
  const navigate = useNavigate();

  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`);
  };
  if (loading && users.length === 0 && posts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">검색 중...</span>
        </div>
      </div>
    );
  }

  if (users.length === 0 && posts.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-16 w-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          검색 결과가 없습니다
        </h3>
        <p className="text-gray-500">
          다른 검색어를 시도하거나 검색 범위를 조정해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 사용자 검색 결과 */}
      {users.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">사용자</h3>
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={`search-user-${user.id}`}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleUserClick(user.username)}
              >
                <div className="flex items-center space-x-3">
                  {user.profileImgUrl && (
                    <img
                      src={user.profileImgUrl}
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {user.fullName || user.username || "Unknown User"}
                      </span>
                      <span className="text-gray-500">
                        @{user.username || "unknown"}
                      </span>
                    </div>
                    {user.bio && (
                      <p className="text-gray-600 text-sm mb-2">{user.bio}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>게시글 {user.postCount}</span>
                      <span>팔로워 {user.followerCount}</span>
                      <span>팔로잉 {user.followingCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 게시글 검색 결과 */}
      {posts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">게시글</h3>
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={`search-post-${post.id}`}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePostClick(post.id)}
              >
                <div className="flex items-start space-x-3">
                  {post.imgUrl && (
                    <img
                      src={post.imgUrl}
                      alt="Post image"
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        게시글
                      </span>
                    </div>
                    <p className="text-gray-900 mb-2 line-clamp-3">
                      {post.content}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                      <span>❤️ {post.likeCount}</span>
                      <span>🔄 {post.repostCount}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">
                        {post.authorName || "Unknown Author"}
                      </span>
                      <span className="text-gray-500 ml-2">
                        @{post.authorUsername || "unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 더 보기 버튼 */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "로딩 중..." : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
