import React from "react";
import Layout from "../features/home/components/Layout";
import ReelsUpload from "../features/reels/components/ReelsUpload";

const ReelsCreatePage: React.FC = () => {
  return (
    <Layout>
      <ReelsUpload />
    </Layout>
  );
};

export default ReelsCreatePage;
