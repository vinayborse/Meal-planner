package com.gojo.recipemealplanner.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .authorizeHttpRequests(auth -> auth
                        // Permit public static frontend resources, error dispatch, auth endpoints, recipes, plans, and console
                        .requestMatchers(
                                "/",
                                "/error",
                                "/index.html",
                                "/login.html",
                                "/*.html",
                                "/*.css",
                                "/*.js",
                                "/api/auth/**",
                                "/api/recipes/**",
                                "/api/plans/**",
                                "/h2-console/**")
                        .permitAll()
                        .anyRequest().authenticated())
                .headers(headers -> headers.frameOptions(frame -> frame.disable()));

        return http.build();
    }
}