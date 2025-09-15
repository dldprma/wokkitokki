/**
 * 이미지 URL을 전체 URL로 변환하는 유틸리티 함수
 * @param imageUrl - 이미지 URL (상대 경로 또는 전체 URL)
 * @returns 전체 URL
 */
export const getFullImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;

  // 이미 전체 URL인 경우 그대로 반환
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // 상대 경로인 경우 프론트엔드 URL과 결합
  if (imageUrl.startsWith("/")) {
    return `http://localhost:5173${imageUrl}`;
  }

  // 상대 경로가 아닌 경우 (예: uploads/profiles/filename)
  return `http://localhost:5173/${imageUrl}`;
};

/**
 * 프로필 이미지 URL을 안전하게 처리하는 함수
 * @param imageUrl - 이미지 URL
 * @param fallback - 이미지가 없을 때 사용할 기본값
 * @returns 처리된 이미지 URL 또는 fallback
 */
export const getProfileImageUrl = (
  imageUrl?: string | null,
  fallback?: string
): string | null => {
  const fullUrl = getFullImageUrl(imageUrl);
  return fullUrl || fallback || null;
};
