package com.winter.wokkitokki.comment.dto;

import lombok.*;

import java.util.List;

/**
 * 댓글 상세조회 응답 DTO
 * 댓글 정보와 하위 대댓글들을 포함
 */
@Getter @Setter @Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentDetailResponseDto {
    private CommentResponseDto comment; // 댓글 정보
    private List<CommentResponseDto> replies; // 대댓글 목록 (없으면 빈 배열)
    private boolean hasReplies; // 대댓글 존재 여부
    private int replyCount; // 총 대댓글 수
    private String message; // 응답 메시지 (선택적)
}