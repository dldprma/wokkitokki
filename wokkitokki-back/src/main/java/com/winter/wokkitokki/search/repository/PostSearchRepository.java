package com.winter.wokkitokki.search.repository;

import com.winter.wokkitokki.search.document.PostDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface PostSearchRepository extends ElasticsearchRepository<PostDocument, String> {
    // 포스트 내용으로 검색
    @Query("{\"match\": {\"content\": {\"query\": \"?0\", \"fuzziness\": \"AUTO\"}}}")
    Page<PostDocument> findByContentContaining(String keyword, Pageable pageable);

    // 최신순으로 포스트 검색
    @Query("{\"bool\": {\"must\": [{\"match\": {\"content\": {\"query\": \"?0\", \"fuzziness\": \"AUTO\"}}}]}}")
    Page<PostDocument> findByContentContainingOrderByCreatedAtDesc(String keyword, Pageable pageable);
}
