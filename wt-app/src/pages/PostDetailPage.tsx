import React from "react";
import { useParams } from "react-router-dom";
import PostDetail from "../features/post/components/PostDetail";

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();

  return <PostDetail postId={postId} />;
};

export default PostDetailPage;
