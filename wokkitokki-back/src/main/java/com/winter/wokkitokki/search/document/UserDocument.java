package com.winter.wokkitokki.search.document;

import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Document(indexName = "users")
@Getter @Setter
public class UserDocument {
    @Id
    private String id; // userId를 String으로 저장

    @Field(type = FieldType.Text, analyzer = "standard")
    private String username;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String fullName;

    @Field(type = FieldType.Text)
    private String bio;

    @Field(type = FieldType.Keyword)
    private String profileImgUrl;

    @Field(type = FieldType.Date)
    private String createdAt;

    @Field(type = FieldType.Integer)
    private int followersCount;

    @Field(type = FieldType.Integer)
    private int followingCount;

    @Field(type = FieldType.Integer)
    private int postCount;
}
