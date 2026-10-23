package com.gojo.recipemealplanner.repository;

import com.gojo.recipemealplanner.model.PlanEntry;
import com.gojo.recipemealplanner.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<PlanEntry, Long> {
    List<PlanEntry> findByUser(User user);
    Optional<PlanEntry> findByIdAndUser(Long id, User user);
    List<PlanEntry> findByRecipeIdAndUser(Long recipeId, User user);

    @Modifying
    @Transactional
    void deleteByRecipeId(Long recipeId);

    @Modifying
    @Transactional
    void deleteByUser(User user);

    List<PlanEntry> findByUserIdIsNull();
}