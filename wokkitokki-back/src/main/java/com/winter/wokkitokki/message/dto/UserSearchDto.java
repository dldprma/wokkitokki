package com.winter.wokkitokki.message.dto;

import com.winter.wokkitokki.search.document.UserDocument;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchDto {
    private Long id;
    private String username;
    private String fullName;
    private String bio;
    private String profileImgUrl;
    private boolean isOnline;
    private Long lastSeen;
    private boolean hasExistingChat;
    private boolean isFollowing;
    private int priority; // 정렬 우선순위 (높을수록 상위)
    
    public static UserSearchDto fromDocument(UserDocument document) {
        UserSearchDto dto = new UserSearchDto();
        dto.setId(Long.valueOf(document.getId()));
        dto.setUsername(document.getUsername());
        dto.setFullName(document.getFullName());
        dto.setBio(document.getBio());
        dto.setProfileImgUrl(document.getProfileImgUrl());
        return dto;
    }
}