package com.winter.wokkitokki.post.dto;

import com.winter.wokkitokki.comment.dto.CommentResponseDto;
import lombok.*;

import java.util.List;

/**
 * 게시글과 관련 댓글을 그룹화한 피드 아이템
 * 피드에서 "게시글 + 관련 댓글" 형태로 표시될 때 사용
 */
@Getter @Setter @Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostWithCommentsDto {
    private PostResponseDto post; // 원본 게시글
    private List<CommentResponseDto> relevantComments; // 관련 댓글들 (내가 작성했거나 팔로우하는 사람이 작성한 댓글)
    private String feedType; // "POST_WITH_COMMENTS" 
    private String lastActivityAt; // 가장 최근 활동 시간 (정렬용)
    private String activitySummary; // "Alice가 댓글을 남겼습니다" 등
}