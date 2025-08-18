// 사용자 프로필 관련 타입
export interface UserProfile {
  id: number;
  fullName: string;
  username: string;
  email: string;
  profileImgUrl?: string;
  bio?: string;
  postCount: number;
  imagePostCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface UpdateProfileData {
  fullName?: string;
  username?: string;
  bio?: string;
  email?: string;
}

// 포스트 관련 타입은 통합된 postTypes에서 import
export type {
  PostImage,
  PageResponse,
  ProfilePostsResponse,
  ProfilePhotosResponse,
  ProfileReelsResponse,
} from "../../post/type/postTypes";
