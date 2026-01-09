package com.winter.wokkitokki.message.repository;

import com.winter.wokkitokki.message.entity.ParticipantState;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ParticipantStateRepository extends JpaRepository<ParticipantState, Long> {

    @Query("SELECT ps FROM ParticipantState ps WHERE ps.user = :user AND ps.pairId = :pairId")
    Optional<ParticipantState> findByUserAndPairId(@Param("user") UserEntity user,
                                                   @Param("pairId") String pairId);

    default ParticipantState findOrCreateByUserAndPairId(UserEntity user, String pairId) {
        return findByUserAndPairId(user, pairId)
                .orElseGet(() -> save(ParticipantState.create(user, pairId)));
    }
}