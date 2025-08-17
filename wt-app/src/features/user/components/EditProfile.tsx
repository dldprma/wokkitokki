import React, { useState } from "react";
import { useAppSelector } from "../../../store/hooks";
import { useUser } from "../hooks/useUser";

interface EditProfileProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ onClose, onSuccess }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { updateProfile } = useUser();

  const [formData, setFormData] = useState({
    fullName: (user as any)?.fullName || "",
    username: (user as any)?.username || "",
    bio: (user as any)?.bio || "",
  });
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string>("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // username 중복 검증
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === (user as any)?.username) {
      setUsernameError("");
      return;
    }

    if (username.length < 3) {
      setUsernameError("사용자명은 3자 이상이어야 합니다.");
      return;
    }

    setIsCheckingUsername(true);
    try {
      // 여기서는 간단한 검증만 수행 (실제로는 API 호출)
      // 백엔드에 username 중복 검증 API가 있다면 사용
      if (username.includes("admin") || username.includes("test")) {
        setUsernameError("이미 사용 중인 사용자명입니다.");
      } else {
        setUsernameError("");
      }
    } catch (error) {
      setUsernameError("사용자명 확인 중 오류가 발생했습니다.");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // username 변경 시 중복 검증
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setFormData((prev) => ({ ...prev, username: newUsername }));

    // 디바운스 처리 (500ms 후 검증)
    setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // username 유효성 검증
    if (usernameError) {
      return;
    }

    setLoading(true);
    try {
      // username을 포함하여 프로필 업데이트
      await updateProfile({
        ...formData,
        username: formData.username,
      });
      onSuccess();
    } catch (error) {
      console.error("프로필 수정 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          이름
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          사용자명
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleUsernameChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        {usernameError && (
          <p className="mt-1 text-sm text-red-600">{usernameError}</p>
        )}
        {isCheckingUsername && (
          <p className="mt-1 text-sm text-gray-600">사용자명 확인 중...</p>
        )}
      </div>

      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          소개
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="자기소개를 입력하세요..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading || !!usernameError || isCheckingUsername}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
};

export default EditProfile;
