package com.gojo.recipemealplanner.repository;

import com.gojo.recipemealplanner.model.Recipe;
import com.gojo.recipemealplanner.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findByUser(User user);
    Optional<Recipe> findByIdAndUser(Long id, User user);
    boolean existsByIdAndUser(Long id, User user);
    List<Recipe> findByUserIdIsNull();
}