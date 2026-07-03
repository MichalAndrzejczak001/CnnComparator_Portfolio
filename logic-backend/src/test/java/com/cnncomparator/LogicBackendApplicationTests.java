package com.cnncomparator;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
class LogicBackendApplicationTests {

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:context-test;MODE=MySQL");
        registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
        registry.add("jwt.secret", () -> "application-context-test-secret-key-long-enough-for-hmac");
        registry.add("ai-backend.url", () -> "http://localhost:0");
    }

    @Test
    void contextLoads() {
    }
}
