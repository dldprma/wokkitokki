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

export interface ProfilePost {
  id: string;
  title: string;
  content: string;
  images?: string[];
  createdAt: string;
  views: number;
  isPublic: boolean;
}

export interface ProfilePhoto {
  id: string;
  imageUrl: string;
  createdAt: string;
  likes: number;
}

export interface ProfileReel {
  id: string;
  videoUrl: string;
  title: string;
  createdAt: string;
  likes: number;
  views: number;
}

export interface ProfileState {
  posts: ProfilePost[];
  photos: ProfilePhoto[];
  reels: ProfileReel[];
  loading: boolean;
  error: string | null;
}

export interface ProfilePostsResponse {
  posts: ProfilePost[];
  hasMore: boolean;
  totalPages: number;
}

export interface ProfilePhotosResponse {
  photos: ProfilePhoto[];
  hasMore: boolean;
  totalPages: number;
}

export interface ProfileReelsResponse {
  reels: ProfileReel[];
  hasMore: boolean;
  totalPages: number;
}
