package com.gojo.recipemealplanner.controller;

import com.gojo.recipemealplanner.model.PlanEntry;
import com.gojo.recipemealplanner.repository.PlanRepository;
import com.gojo.recipemealplanner.repository.RecipeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/plans")
@CrossOrigin(origins = "*")
public class PlanController {

    private final PlanRepository planRepository;
    private final RecipeRepository recipeRepository;

    public PlanController(PlanRepository planRepository, RecipeRepository recipeRepository) {
        this.planRepository = planRepository;
        this.recipeRepository = recipeRepository;
    }

    // 1. Get all scheduled meals
    @GetMapping
    public List<PlanEntry> getAllPlans() {
        return planRepository.findAll();
    }

    // 2. Schedule a recipe to a specific day
    @PostMapping
    public ResponseEntity<?> createPlan(@RequestBody PlanEntry planEntry) {
        if (planEntry.getDay() == null || planEntry.getDay().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Day of the week is required!"));
        }
        if (planEntry.getRecipeId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Recipe ID is required!"));
        }

        // Verify that the referenced recipe actually exists in the database
        if (!recipeRepository.existsById(planEntry.getRecipeId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Referenced recipe does not exist with ID: " + planEntry.getRecipeId()));
        }

        PlanEntry saved = planRepository.save(planEntry);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // 3. Delete a single planned entry
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable("id") Long id) {
        if (planRepository.existsById(id)) {
            planRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // 4. Clear the full week's schedule
    @DeleteMapping("/clear")
    public ResponseEntity<Map<String, String>> clearAllPlans() {
        planRepository.deleteAll();
        return ResponseEntity.ok(Map.of("message", "Weekly meal schedule cleared successfully."));
    }
}