import React from "react";
import { getFullImageUrl } from "../../../utils/imageUtils";
import "../../../css/ProfileImage.css";

interface ProfileImageProps {
  imageUrl?: string;
  username: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const ProfileImage: React.FC<ProfileImageProps> = ({
  imageUrl,
  username,
  size = "lg",
  className = "",
}) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "profile-image-sm";
      case "lg":
        return "profile-image-lg";
      case "xl":
        return "profile-image-xl";
      default:
        return "profile-image-md";
    }
  };

  const [imageError, setImageError] = React.useState(false);

  const fullImageUrl = getFullImageUrl(imageUrl);

  if (fullImageUrl && !imageError) {
    return (
      <img
        src={fullImageUrl}
        alt={`${username}의 프로필`}
        className={`profile-image ${getSizeClasses()} ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={`profile-image-fallback ${getSizeClasses()} ${className}`}>
      <span className="profile-image-emoji">👤</span>
      <span className="profile-image-initials">{getInitials(username)}</span>
    </div>
  );
};

export default ProfileImage;
