package com.winter.wokkitokki.message.service;

import com.winter.wokkitokki.message.dto.UserSearchDto;
import com.winter.wokkitokki.message.repository.ChatRoomRepository;
import com.winter.wokkitokki.search.document.UserDocument;
import com.winter.wokkitokki.search.repository.UserSearchRepository;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.FollowRepository;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageUserSearchService {

    private final UserSearchRepository userSearchRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final FollowRepository followRepository;
    private final MessageCacheService messageCacheService;

    public List<UserSearchDto> searchUsersForChat(String keyword, Long currentUserId, int size) {
        try {
            UserEntity currentUser = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new RuntimeException("Current user not found"));

            List<Long> followingIds = followRepository.findFollowingIdsByFollowerId(currentUserId);
            
            List<UserDocument> userDocuments = new ArrayList<>();

            // 1. 정확한 매칭부터 시도 (prefix 검색)
            List<UserDocument> prefixResults = userSearchRepository.findByUsernameOrFullNameStartingWith(keyword);
            userDocuments.addAll(prefixResults);

            // 2. 부족하면 와일드카드 검색 추가
            if (userDocuments.size() < size && keyword.length() >= 2) {
                List<UserDocument> wildcardResults = userSearchRepository.findByUsernameOrFullNameContaining(keyword)
                        .stream()
                        .filter(doc -> !userDocuments.stream().anyMatch(existing -> existing.getId().equals(doc.getId())))
                        .collect(Collectors.toList());
                userDocuments.addAll(wildcardResults);
            }

            // 3. 여전히 부족하면 퍼지 검색
            if (userDocuments.size() < size && keyword.length() >= 3) {
                Pageable pageable = PageRequest.of(0, size * 2);
                Page<UserDocument> fuzzyResults = userSearchRepository.findByUsernameOrFullName(keyword, pageable);
                List<UserDocument> newResults = fuzzyResults.getContent()
                        .stream()
                        .filter(doc -> !userDocuments.stream().anyMatch(existing -> existing.getId().equals(doc.getId())))
                        .collect(Collectors.toList());
                userDocuments.addAll(newResults);
            }

            return userDocuments.stream()
                    .filter(doc -> !doc.getId().equals(currentUserId.toString()))
                    .filter(doc -> {
                        // 탈퇴한 사용자 제외
                        UserEntity user = userRepository.findById(Long.valueOf(doc.getId())).orElse(null);
                        return user != null && (user.getDeleted() == null || !user.getDeleted());
                    })
                    .map(document -> {
                        UserSearchDto dto = UserSearchDto.fromDocument(document);
                        Long userId = Long.valueOf(document.getId());
                        
                        dto.setOnline(messageCacheService.isUserOnline(userId));
                        dto.setLastSeen(messageCacheService.getUserLastSeen(userId));
                        
                        boolean hasExistingChat = chatRoomRepository.findByUsers(currentUser, 
                            userRepository.findById(userId).orElse(null)).isPresent();
                        dto.setHasExistingChat(hasExistingChat);
                        
                        boolean isFollowing = followingIds.contains(userId);
                        dto.setFollowing(isFollowing);
                        
                        int priority = calculatePriority(isFollowing, hasExistingChat, dto.isOnline());
                        dto.setPriority(priority);
                        
                        return dto;
                    })
                    .sorted((a, b) -> Integer.compare(b.getPriority(), a.getPriority()))
                    .limit(size)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error searching users for chat: {}", e.getMessage(), e);
            return List.of();
        }
    }

    private int calculatePriority(boolean isFollowing, boolean hasExistingChat, boolean isOnline) {
        int priority = 0;
        if (isFollowing) priority += 100;
        if (hasExistingChat) priority += 50;
        if (isOnline) priority += 10;
        return priority;
    }

    public List<UserSearchDto> searchUsersAutocomplete(String keyword, Long currentUserId, int limit) {
        try {
            if (keyword.length() < 2) {
                return List.of();
            }

            List<Long> followingIds = followRepository.findFollowingIdsByFollowerId(currentUserId);
            UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);

            List<UserDocument> userDocuments = new ArrayList<>();

            // 1. prefix 검색
            List<UserDocument> prefixResults = userSearchRepository.findByUsernameOrFullNameStartingWith(keyword);
            userDocuments.addAll(prefixResults);

            // 2. 부족하면 와일드카드 검색 추가
            if (userDocuments.size() < limit) {
                List<UserDocument> wildcardResults = userSearchRepository.findByUsernameOrFullNameContaining(keyword)
                        .stream()
                        .filter(doc -> !userDocuments.stream().anyMatch(existing -> existing.getId().equals(doc.getId())))
                        .collect(Collectors.toList());
                userDocuments.addAll(wildcardResults);
            }

            return userDocuments.stream()
                    .filter(doc -> !doc.getId().equals(currentUserId.toString()))
                    .filter(doc -> {
                        // 탈퇴한 사용자 제외
                        UserEntity user = userRepository.findById(Long.valueOf(doc.getId())).orElse(null);
                        return user != null && (user.getDeleted() == null || !user.getDeleted());
                    })
                    .limit(limit * 2)
                    .map(document -> {
                        UserSearchDto dto = UserSearchDto.fromDocument(document);
                        Long userId = Long.valueOf(document.getId());
                        
                        dto.setOnline(messageCacheService.isUserOnline(userId));
                        dto.setLastSeen(messageCacheService.getUserLastSeen(userId));
                        
                        boolean isFollowing = followingIds.contains(userId);
                        dto.setFollowing(isFollowing);
                        
                        boolean hasExistingChat = currentUser != null && 
                            chatRoomRepository.findByUsers(currentUser, 
                                userRepository.findById(userId).orElse(null)).isPresent();
                        dto.setHasExistingChat(hasExistingChat);
                        
                        int priority = calculatePriority(isFollowing, hasExistingChat, dto.isOnline());
                        dto.setPriority(priority);
                        
                        return dto;
                    })
                    .sorted((a, b) -> Integer.compare(b.getPriority(), a.getPriority()))
                    .limit(limit)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error in user autocomplete: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public List<UserSearchDto> getRecentChatUsers(Long currentUserId, int limit) {
        try {
            UserEntity currentUser = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            return chatRoomRepository.findByUser(currentUser)
                    .stream()
                    .filter(chatRoom -> chatRoom.isActive())
                    .limit(limit)
                    .map(chatRoom -> {
                        UserEntity otherUser = chatRoom.getUser1().getId().equals(currentUserId)
                                ? chatRoom.getUser2() : chatRoom.getUser1();

                        // 탈퇴한 사용자 제외
                        if (otherUser.getDeleted() != null && otherUser.getDeleted()) {
                            return null;
                        }

                        UserSearchDto dto = new UserSearchDto();
                        dto.setId(otherUser.getId());
                        dto.setUsername(otherUser.getUsername());
                        dto.setFullName(otherUser.getFullName());
                        dto.setBio(otherUser.getBio());
                        dto.setProfileImgUrl(otherUser.getProfileImgUrl());
                        dto.setOnline(messageCacheService.isUserOnline(otherUser.getId()));
                        dto.setLastSeen(messageCacheService.getUserLastSeen(otherUser.getId()));
                        dto.setHasExistingChat(true);

                        return dto;
                    })
                    .filter(dto -> dto != null)  // null 제거
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error getting recent chat users: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public List<UserSearchDto> searchFollowingUsersForShare(String keyword, Long currentUserId, int size) {
        try {
            List<Long> followingIds = followRepository.findFollowingIdsByFollowerId(currentUserId);
            
            if (followingIds.isEmpty()) {
                return List.of();
            }

            List<UserDocument> userDocuments;
            
            if (keyword == null || keyword.trim().isEmpty()) {
                Iterable<UserDocument> allDocuments = userSearchRepository.findAllById(
                    followingIds.stream().map(String::valueOf).collect(Collectors.toList())
                );
                userDocuments = new ArrayList<>();
                for (UserDocument doc : allDocuments) {
                    userDocuments.add(doc);
                    if (userDocuments.size() >= size) {
                        break;
                    }
                }
            } else {
                userDocuments = new ArrayList<>();

                // prefix 검색
                List<UserDocument> prefixResults = userSearchRepository.findByUsernameOrFullNameStartingWith(keyword)
                        .stream()
                        .filter(doc -> followingIds.contains(Long.valueOf(doc.getId())))
                        .collect(Collectors.toList());
                userDocuments.addAll(prefixResults);

                // 부족하면 와일드카드 검색
                if (userDocuments.size() < size) {
                    List<UserDocument> wildcardResults = userSearchRepository.findByUsernameOrFullNameContaining(keyword)
                            .stream()
                            .filter(doc -> followingIds.contains(Long.valueOf(doc.getId())))
                            .filter(doc -> !userDocuments.stream().anyMatch(existing -> existing.getId().equals(doc.getId())))
                            .collect(Collectors.toList());
                    userDocuments.addAll(wildcardResults);
                }

                // 여전히 부족하면 퍼지 검색
                if (userDocuments.size() < size) {
                    Pageable pageable = PageRequest.of(0, size * 3);
                    Page<UserDocument> fuzzyResults = userSearchRepository.findByUsernameOrFullName(keyword, pageable);
                    List<UserDocument> newResults = fuzzyResults.getContent()
                            .stream()
                            .filter(doc -> followingIds.contains(Long.valueOf(doc.getId())))
                            .filter(doc -> !userDocuments.stream().anyMatch(existing -> existing.getId().equals(doc.getId())))
                            .collect(Collectors.toList());
                    userDocuments.addAll(newResults);
                }
            }

            return userDocuments.stream()
                    .filter(doc -> {
                        // 탈퇴한 사용자 제외
                        UserEntity user = userRepository.findById(Long.valueOf(doc.getId())).orElse(null);
                        return user != null && (user.getDeleted() == null || !user.getDeleted());
                    })
                    .map(document -> {
                        UserSearchDto dto = UserSearchDto.fromDocument(document);
                        Long userId = Long.valueOf(document.getId());

                        dto.setOnline(messageCacheService.isUserOnline(userId));
                        dto.setLastSeen(messageCacheService.getUserLastSeen(userId));
                        dto.setHasExistingChat(true);

                        return dto;
                    })
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error searching following users for share: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public boolean canSendMessageTo(Long senderId, Long receiverId) {
        try {
            // 메시지는 누구에게나 보낼 수 있음 (단, 존재하고 탈퇴하지 않은 사용자인지 확인)
            UserEntity receiver = userRepository.findById(receiverId).orElse(null);
            return receiver != null && (receiver.getDeleted() == null || !receiver.getDeleted());
        } catch (Exception e) {
            log.error("Error checking if can send message: {}", e.getMessage(), e);
            return false;
        }
    }

    public List<UserSearchDto> getFollowingUsers(Long currentUserId, int limit) {
        try {
            List<Long> followingIds = followRepository.findFollowingIdsByFollowerId(currentUserId);
            
            if (followingIds.isEmpty()) {
                return List.of();
            }

            return userRepository.findAllById(followingIds)
                    .stream()
                    .filter(user -> user.getDeleted() == null || !user.getDeleted())  // 탈퇴한 사용자 제외
                    .limit(limit)
                    .map(user -> {
                        UserSearchDto dto = new UserSearchDto();
                        dto.setId(user.getId());
                        dto.setUsername(user.getUsername());
                        dto.setFullName(user.getFullName());
                        dto.setBio(user.getBio());
                        dto.setProfileImgUrl(user.getProfileImgUrl());
                        dto.setOnline(messageCacheService.isUserOnline(user.getId()));
                        dto.setLastSeen(messageCacheService.getUserLastSeen(user.getId()));
                        
                        boolean hasExistingChat = chatRoomRepository.findByUsers(
                            userRepository.findById(currentUserId).orElse(null), user).isPresent();
                        dto.setHasExistingChat(hasExistingChat);
                        
                        return dto;
                    })
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error getting following users: {}", e.getMessage(), e);
            return List.of();
        }
    }
}