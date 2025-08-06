export interface User {
  id?: string;
  username: string;
  email: string;
  fullName: string;
  profileImage?: string;
  createdAt?: string;
  postsCount?: number;
  reelsCount?: number;
  followersCount?: number;
  followingCount?: number;
  totalLikes?: number;
}

export interface UpdateProfileData {
  fullName?: string;
  profileImage?: string;
}

export interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
