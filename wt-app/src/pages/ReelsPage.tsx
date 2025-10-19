import React from "react";
import Layout from "../features/home/components/Layout";
import ReelsContent from "../features/reels/components/ReelsContent";

const ReelsPage: React.FC = () => {
  return (
    <>
      <Layout>
        <ReelsContent />
      </Layout>
    </>
  );
};

export default ReelsPage;
