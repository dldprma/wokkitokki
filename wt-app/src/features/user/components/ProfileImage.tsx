import React from "react";
import "../../../css/ProfileImage.css";

interface ProfileImageProps {
  imageUrl?: string;
  username: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ProfileImage: React.FC<ProfileImageProps> = ({
  imageUrl,
  username,
  size = "md",
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
      default:
        return "profile-image-md";
    }
  };

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${username}의 프로필`}
        className={`profile-image ${getSizeClasses()} ${className}`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = "flex";
        }}
      />
    );
  }

  return (
    <div className={`profile-image-fallback ${getSizeClasses()} ${className}`}>
      <span className="profile-image-emoji">👤</span>
    </div>
  );
};

export default ProfileImage;
