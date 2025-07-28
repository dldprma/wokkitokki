import RegisterForm from "../features/auth/components/RegisterForm";
import FallingEmojiBackground from "../utils/FallingEmojiBackground";

const RegisterPage = () => {
  return (
    <>
      <FallingEmojiBackground /> {/* 배경 이모지 비 */}
      <RegisterForm /> {/* 회원가입 폼 */}
    </>
  );
};

export default RegisterPage;
