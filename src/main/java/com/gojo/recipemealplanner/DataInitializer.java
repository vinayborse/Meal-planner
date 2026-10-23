package com.gojo.recipemealplanner;

import com.gojo.recipemealplanner.model.Recipe; // Apka Recipe model/entity
import com.gojo.recipemealplanner.repository.RecipeRepository; // Apka repository
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(RecipeRepository recipeRepository) {
        return args -> {
            // Check karein taaki duplicate entries na ho
            if (recipeRepository.count() == 0) {

                Recipe r1 = new Recipe();
                r1.setName("Marinated Flank");
                r1.setDietPref("Non-Veg");
                r1.setCuisine("American");
                r1.setPrepTime(45);
                r1.setMealType("Dinner");
                r1.setCalories(520);
                r1.setMacros("P: 42g, C: 4g, F: 35g");
                r1.setIngredients(
                        "1 flank steak, 3 tbsp olive oil, 2 tbsp soy sauce, 2 cloves garlic, 1 tsp black pepper");
                r1.setInstructions(
                        "Whisk olive oil, soy sauce, minced garlic, and pepper in a bowl. Place flank steak in a zip-top bag and pour marinade over it. Refrigerate for at least 4 hours. Grill over medium-high heat for 6-8 minutes per side. Slice thin across the grain.");

                recipeRepository.save(r1);

                // Isi tarah aur bhi recipes add kar sakte hain...
                System.out.println("Default recipes initialized successfully!");
            }
        };
    }
}