package com.gojo.recipemealplanner.controller;

import com.gojo.recipemealplanner.model.User;
import com.gojo.recipemealplanner.repository.UserRepository;
import com.gojo.recipemealplanner.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private static final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // 1. REGISTER: Create account directly with username and password (No OTP)
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        String email = request.get("email");

        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is required!"));
        }
        if (password == null || password.length() < 4) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 4 characters long!"));
        }

        username = username.trim();

        // Check if username already exists
        Optional<User> existingByUsername = userRepository.findByUsername(username);
        if (existingByUsername.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is already taken!"));
        }

        if (email == null || email.trim().isEmpty()) {
            email = username.toLowerCase() + "@local";
        } else {
            email = email.trim().toLowerCase();
            Optional<User> existingByEmail = userRepository.findByEmail(email);
            if (existingByEmail.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered!"));
            }
        }

        User userToSave = new User();
        userToSave.setUsername(username);
        userToSave.setEmail(email);
        userToSave.setPassword(passwordEncoder.encode(password));
        userToSave.setRole("ROLE_USER");
        userToSave.setVerified(true);
        userToSave.setEnabled(true);

        userRepository.save(userToSave);

        return ResponseEntity.ok(Map.of(
                "message", "Account created successfully! You can now sign in.",
                "username", username));
    }

    // 2. VERIFY OTP (Stub for backward compatibility)
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(Map.of("message", "Account verified successfully!"));
    }

    // 3. RESEND OTP (Stub for backward compatibility)
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(Map.of("message", "OTP verification is disabled."));
    }

    // 4. LOGIN: Verify credentials and authenticate immediately
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");

        if (username == null || password == null || username.trim().isEmpty() || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password are required!"));
        }

        username = username.trim();

        // Support login with either username or email
        Optional<User> optionalUser = userRepository.findByUsername(username);
        if (optionalUser.isEmpty() && username.contains("@")) {
            optionalUser = userRepository.findByEmail(username.toLowerCase());
        }

        if (optionalUser.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid username or password!"));
        }

        User user = optionalUser.get();

        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid username or password!"));
        }

        // Auto-verify if legacy account was unverified
        if (!user.isVerified()) {
            user.setVerified(true);
            user.setOtp(null);
            user.setOtpGeneratedTime(null);
            userRepository.save(user);
        }

        return ResponseEntity.ok(Map.of(
                "message", "Login successful!",
                "username", user.getUsername(),
                "email", user.getEmail() != null ? user.getEmail() : ""));
    }
}