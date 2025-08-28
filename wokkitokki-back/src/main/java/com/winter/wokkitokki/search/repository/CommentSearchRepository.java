package com.winter.wokkitokki.search.repository;

import com.winter.wokkitokki.search.document.CommentDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentSearchRepository extends ElasticsearchRepository<CommentDocument, String> {
}