import React, { useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { useAuth } from "../../auth/hooks/useAuth";
import { useUser } from "../hooks/useUser";
import { updateUserProfile } from "../store/userSlice";

interface EditProfileProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ onClose, onSuccess }) => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { checkUsernameDuplicate } = useAuth();
  const { removeProfileImage } = useUser();

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
      // 실제 username 중복 검증 API 호출
      const result = await checkUsernameDuplicate(username);
      if (
        result.meta.requestStatus === "fulfilled" &&
        (result.payload as any)?.exists
      ) {
        setUsernameError("이미 사용 중인 사용자명입니다.");
      } else if (
        result.meta.requestStatus === "fulfilled" &&
        !(result.payload as any)?.exists
      ) {
        setUsernameError("");
      } else {
        setUsernameError("사용자명 확인 중 오류가 발생했습니다.");
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
      await dispatch(
        updateUserProfile({
          ...formData,
          username: formData.username,
        })
      );
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

  // 프로필 이미지 제거 처리
  const handleRemoveProfileImage = async () => {
    if (!window.confirm("프로필 이미지를 제거하시겠습니까?")) {
      return;
    }

    try {
      await removeProfileImage();
      onSuccess(); // 프로필 데이터 새로고침
      alert("프로필 이미지가 제거되었습니다.");
    } catch (error) {
      console.error("프로필 이미지 제거 실패:", error);
      alert("프로필 이미지 제거에 실패했습니다. 다시 시도해주세요.");
    }
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

      <div className="flex justify-between items-center pt-4">
        <button
          type="button"
          onClick={handleRemoveProfileImage}
          className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
        >
          프로필 이미지 제거
        </button>

        <div className="flex space-x-3">
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
      </div>
    </form>
  );
};

export default EditProfile;
