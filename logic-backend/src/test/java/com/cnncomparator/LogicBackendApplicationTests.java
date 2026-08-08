package com.cnncomparator;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
class LogicBackendApplicationTests {

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        // DB_CLOSE_DELAY=-1 keeps this in-memory DB alive between connections: Flyway opens
        // its own connection to migrate the schema before the JPA connection pool starts,
        // and without this flag H2 discards the whole database the moment that connection
        // closes, so Hibernate's later ddl-auto: validate would see an empty schema.
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:context-test;MODE=MySQL;DB_CLOSE_DELAY=-1");
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
