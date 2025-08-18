package com.winter.wokkitokki.search.document;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Document(indexName = "posts")
@Getter @Setter
public class PostDocument {
    @Id
    private String id; // postId를 String으로 저장

    @Field(type = FieldType.Text, analyzer = "standard")
    private String content;

    @Field(type = FieldType.Keyword)
    private String imgUrl;

    @Field(type = FieldType.Long)
    private Long authorId;

    @Field(type = FieldType.Text)
    private String authorUsername;

    @Field(type = FieldType.Text)
    private String authorFullName;

    @Field(type = FieldType.Keyword)
    private String authorProfileImg;

    @Field(type = FieldType.Integer)
    private int likeCount;

    @Field(type = FieldType.Integer)
    private int repostCount;

    @Field(type = FieldType.Date)
    private String createdAt;
}
