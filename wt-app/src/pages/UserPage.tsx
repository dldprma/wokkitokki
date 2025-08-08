import React from "react";
import Profile from "../features/user/components/Profile";
import Layout from "../features/home/components/Layout";

const UserPage = () => {
  return (
    <>
      <Layout>
        <Profile />
      </Layout>
    </>
  );
};

export default UserPage;
