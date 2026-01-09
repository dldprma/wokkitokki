package com.winter.wokkitokki.common.config;

import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.search.document.PostDocument;
import com.winter.wokkitokki.search.repository.PostSearchRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class BackfillRunnerConfig {

    private final PostRepository postRepository;
    private final PostSearchRepository postSearchRepository;

    public BackfillRunnerConfig(PostRepository postRepository, PostSearchRepository postSearchRepository) {
        this.postRepository = postRepository;
        this.postSearchRepository = postSearchRepository;
    }

    @Bean
    public CommandLineRunner backfill() {
        return args -> {
            List<PostEntity> posts = postRepository.findAll();
            List<PostDocument> postDocuments = posts.stream()
                    .map(this::convertToDocument)
                    .collect(Collectors.toList());
            postSearchRepository.saveAll(postDocuments);
        };
    }

    private PostDocument convertToDocument(PostEntity postEntity) {
        PostDocument postDocument = new PostDocument();
        postDocument.setId(postEntity.getId().toString());
        postDocument.setContent(postEntity.getContent());
        // 필요한 다른 필드들도 여기에 추가
        return postDocument;
    }
}