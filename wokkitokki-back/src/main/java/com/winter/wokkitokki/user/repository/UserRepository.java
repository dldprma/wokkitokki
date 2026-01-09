package com.winter.wokkitokki.user.repository;

import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);
    Optional<UserEntity> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    
    // 탈퇴하지 않은 사용자만 조회하는 메서드들
    Optional<UserEntity> findByUsernameAndDeletedFalse(String username);
    Optional<UserEntity> findByEmailAndDeletedFalse(String email);
    Optional<UserEntity> findByIdAndDeletedFalse(Long id);
    boolean existsByUsernameAndDeletedFalse(String username);
    boolean existsByEmailAndDeletedFalse(String email);
}
