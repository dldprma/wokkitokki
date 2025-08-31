// 통합된 postTypes에서 필요한 타입들을 re-export
export type {
  Post,
  CreatePostData,
  PostResponse,
  PostWithCommentsDto,
  HomeState,
} from "../../post/type/postTypes";

// 기존 homeTypes의 다른 타입들이 있다면 여기에 추가
// 현재는 모든 포스트 관련 타입이 postTypes로 통합되었으므로 re-export만 수행
