import React from "react";
import { useParams } from "react-router-dom";
import CommentDetail from "../features/comment/components/CommentDetail";
import Nav from "../features/home/components/Nav";

const CommentDetailPage: React.FC = () => {
  const { commentId } = useParams<{ commentId: string }>();

  if (!commentId) {
    return <div>댓글 ID가 없습니다.</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Nav />
      <div className="flex-1 ml-64">
        <div className="max-w-2xl py-8 px-6 ml-8">
          <CommentDetail commentId={parseInt(commentId)} />
        </div>
      </div>
    </div>
  );
};

export default CommentDetailPage;
