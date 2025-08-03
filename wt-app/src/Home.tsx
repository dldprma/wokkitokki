import React from "react";
import { useAppSelector } from "./store/hooks";

const Home = () => {
  const { user } = useAppSelector((state) => state.auth);
  return (
    <div>
      <div className="wrapper">
        <div className="formBox">
          <h1 className="title">Wokki Tokki 홈페이지</h1>
          <p className="text-center text-lg mb-4">
            환영합니다, {user?.fullName || user?.username}님!
          </p>
          <p className="text-center text-gray-600">
            로그인이 성공적으로 완료되었습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
