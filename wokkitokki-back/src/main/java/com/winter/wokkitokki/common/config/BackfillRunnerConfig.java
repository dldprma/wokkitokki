package com.winter.wokkitokki.common.config;

import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.search.service.SearchIndexService;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@Configuration
@ConditionalOnProperty(value = "app.es.backfill.enabled", havingValue = "true")
public class BackfillRunnerConfig {

    @Bean
    public ApplicationRunner backfillToElasticsearch(PostRepository postRepo,
                                                     UserRepository userRepo,
                                                     SearchIndexService indexer) {
        return args -> {
            int page = 0, size = 500;
            Page<PostEntity> posts;
            do {
                posts = postRepo.findAll(PageRequest.of(page, size));
                posts.forEach(indexer::indexPost);
                page++;
            } while (!posts.isEmpty());

            int up = 0, usize = 500;
            Page<UserEntity> users;
            do {
                users = userRepo.findAll(PageRequest.of(up, usize));
                users.forEach(indexer::indexUser);
                up++;
            } while (!users.isEmpty());
        };
    }
}