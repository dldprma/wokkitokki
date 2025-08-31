package com.winter.wokkitokki.search.repository;

import com.winter.wokkitokki.search.document.UserDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface UserSearchRepository extends ElasticsearchRepository<UserDocument, String> {
    // 사용자명 또는 실명으로 검색
    @Query("{\"multi_match\": {\"query\": \"?0\", \"fields\": [\"username^2\", \"fullName\"], \"type\": \"best_fields\", \"fuzziness\": \"AUTO\"}}")
    Page<UserDocument> findByUsernameOrFullName(String keyword, Pageable pageable);

    // 자동완성용 (prefix 검색)
    @Query("{\"multi_match\": {\"query\": \"?0\", \"fields\": [\"username^2\", \"fullName\"], \"type\": \"phrase_prefix\"}}")
    List<UserDocument> findByUsernameOrFullNameStartingWith(String keyword);

    List<UserDocument> findByUsernameIgnoreCase(String username);
    
    // 와일드카드 검색 (부분 문자열 매칭)
    @Query("{\"bool\": {\"should\": [{\"wildcard\": {\"username\": {\"value\": \"*?0*\"}}}, {\"wildcard\": {\"fullName\": {\"value\": \"*?0*\"}}}]}}")
    List<UserDocument> findByUsernameOrFullNameContaining(String keyword);
}
