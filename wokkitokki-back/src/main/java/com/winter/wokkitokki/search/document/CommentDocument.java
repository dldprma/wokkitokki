package com.winter.wokkitokki.search.document;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Document(indexName = "comments")
@Getter @Setter
public class CommentDocument {
    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "nori")
    private String content;

    @Field(type = FieldType.Keyword)
    private String imageUrl;

    @Field(type = FieldType.Long)
    private Long authorId;

    @Field(type = FieldType.Text)
    private String authorUsername;

    @Field(type = FieldType.Text)
    private String authorFullName;

    @Field(type = FieldType.Keyword)
    private String authorProfileImg;

    @Field(type = FieldType.Long)
    private Long postId;

    @Field(type = FieldType.Long)
    private Long parentCommentId;

    @Field(type = FieldType.Integer)
    private int likeCount;

    @Field(type = FieldType.Integer)
    private int repostCount;

    @Field(type = FieldType.Integer)
    private int replyCount;

    @Field(type = FieldType.Date)
    private String createdAt;

    @Field(type = FieldType.Date)
    private String updatedAt;
}