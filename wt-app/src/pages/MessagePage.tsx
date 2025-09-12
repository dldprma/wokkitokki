import React from "react";
import ChatRoomList from "../features/message/components/ChatRoomList";
import Layout from "../features/home/components/Layout";

const MessagePage: React.FC = () => {
  return (
    <Layout>
      <ChatRoomList />
    </Layout>
  );
};

export default MessagePage;
