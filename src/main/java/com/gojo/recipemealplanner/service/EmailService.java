package com.gojo.recipemealplanner.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public boolean isConfigured() {
        return mailSender != null && mailUsername != null && !mailUsername.trim().isEmpty();
    }

    public void sendOtpEmail(String toEmail, String otp) {
        if (!isConfigured()) {
            logger.warn("SMTP credentials not configured. Development mode: OTP for {} is: {}", toEmail, otp);
            System.out.println("=================================================================");
            System.out.println(">> SMART RECIPE PLANNER (DEV MODE) OTP for [" + toEmail + "]: " + otp);
            System.out.println("=================================================================");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setFrom(mailUsername);
            message.setSubject("Smart Recipe Planner - Email Verification OTP");
            message.setText("Your OTP for email verification is: " + otp + "\n\nThis OTP is valid for 5 minutes.");
            mailSender.send(message);
            logger.info("OTP verification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send email via SMTP to {}: {}", toEmail, e.getMessage());
            // Fallback print to console so development is not blocked
            System.out.println(">> SMTP SEND FAILED. DEV OTP for [" + toEmail + "]: " + otp);
            throw e;
        }
    }
}