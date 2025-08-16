// 통합된 postApi에서 필요한 함수들을 re-export
export {
  getFeedPosts,
  createPost,
  toggleLike,
  toggleRepost,
} from "../../post/api/postApi";

// 기존 homeApi의 다른 함수들이 있다면 여기에 추가
// 현재는 모든 포스트 관련 API가 postApi로 통합되었으므로 re-export만 수행
