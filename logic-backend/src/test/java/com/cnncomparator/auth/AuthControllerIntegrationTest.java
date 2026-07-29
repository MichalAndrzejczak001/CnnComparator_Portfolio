package com.cnncomparator.auth;

import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Epic("Authentication")
@Feature("Register & login")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @Story("Happy path")
    @Severity(SeverityLevel.CRITICAL)
    void registerThenLoginReturnsToken() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"integration_user","password":"password123"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(content().string(matchesJsonSchemaInClasspath("schemas/auth-response.schema.json")));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"integration_user","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(content().string(matchesJsonSchemaInClasspath("schemas/auth-response.schema.json")));
    }

    @Test
    @Story("Validation")
    @Severity(SeverityLevel.NORMAL)
    void registerRejectsDuplicateUsername() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"duplicate_user","password":"password123"}
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"duplicate_user","password":"password123"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Story("Validation")
    @Severity(SeverityLevel.NORMAL)
    void loginWithWrongPasswordReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"wrongpass_user","password":"password123"}
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"wrongpass_user","password":"totally-wrong"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Story("Validation")
    @Severity(SeverityLevel.NORMAL)
    void registerRejectsBlankUsername() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"","password":"password123"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Story("Validation")
    @Severity(SeverityLevel.NORMAL)
    void registerRejectsPasswordShorterThanEightCharacters() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"short_password_user","password":"short"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Story("Destructive")
    @Severity(SeverityLevel.MINOR)
    void registerRejectsUsernameOverMaxLength() throws Exception {
        String tooLongUsername = "a".repeat(101);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + tooLongUsername + "\",\"password\":\"password123\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Story("Destructive")
    @Severity(SeverityLevel.NORMAL)
    void registerRejectsMalformedJsonBody() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"broken\", \"password\": "))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Story("Security")
    @Severity(SeverityLevel.CRITICAL)
    void registerAndLoginHandleSqlInjectionStyleUsernameSafely() throws Exception {
        String injectionAttempt = "'; DROP TABLE users; --";

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + injectionAttempt + "\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + injectionAttempt + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }
}
