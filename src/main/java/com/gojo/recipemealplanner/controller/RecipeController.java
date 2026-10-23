package com.gojo.recipemealplanner.controller;

import com.gojo.recipemealplanner.model.Recipe;
import com.gojo.recipemealplanner.repository.PlanRepository;
import com.gojo.recipemealplanner.repository.RecipeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/recipes")
@CrossOrigin(origins = "*")
public class RecipeController {

    @Autowired
    private RecipeRepository recipeRepository;

    @Autowired
    private PlanRepository planRepository;

    // 1. Fetch all recipes
    @GetMapping
    public List<Recipe> getAllRecipes() {
        return recipeRepository.findAll();
    }

    // 2. Fetch single recipe by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getRecipeById(@PathVariable("id") Long id) {
        Optional<Recipe> recipe = recipeRepository.findById(id);
        if (recipe.isPresent()) {
            return ResponseEntity.ok(recipe.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Recipe not found with ID: " + id));
    }

    // 3. Add single recipe with validation
    @PostMapping
    public ResponseEntity<?> addRecipe(@RequestBody Recipe recipe) {
        if (recipe.getName() == null || recipe.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Recipe name is required"));
        }
        if (recipe.getIngredients() == null || recipe.getIngredients().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ingredients list is required"));
        }
        if (recipe.getInstructions() == null || recipe.getInstructions().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cooking instructions are required"));
        }
        if (recipe.getPrepTime() == null || recipe.getPrepTime() <= 0) {
            recipe.setPrepTime(15); // default fallback
        }

        Recipe savedRecipe = recipeRepository.save(recipe);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRecipe);
    }

    // 4. Bulk save recipes
    @PostMapping("/batch")
    public ResponseEntity<List<Recipe>> addMultipleRecipes(@RequestBody List<Recipe> recipes) {
        List<Recipe> savedRecipes = recipeRepository.saveAll(recipes);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRecipes);
    }

    // 5. Delete recipe and cascade delete all associated plan entries
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecipe(@PathVariable("id") Long id) {
        if (recipeRepository.existsById(id)) {
            // Delete references in weekly meal plan first to maintain database consistency
            planRepository.deleteByRecipeId(id);
            recipeRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}