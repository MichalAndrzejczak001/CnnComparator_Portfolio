package com.cnncomparator;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.cucumber.spring.CucumberContextConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

@CucumberContextConfiguration
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class CucumberSpringConfiguration {

    private static final HttpServer AI_BACKEND_STUB = startAiBackendStub();

    @DynamicPropertySource
    static void aiBackendUrl(DynamicPropertyRegistry registry) {
        registry.add("ai-backend.url", () -> "http://localhost:" + AI_BACKEND_STUB.getAddress().getPort());
    }

    private static HttpServer startAiBackendStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
            server.createContext("/experiments", exchange -> writeJson(exchange, "{\"status\":\"ok\","
                    + "\"model_id\":\"abc-123\",\"train_loss_per_epoch\":[0.9,0.5],\"test_loss_per_epoch\":[0.8,0.4],"
                    + "\"test_loss\":0.4,\"test_accuracy\":0.91,\"training_time_seconds\":12.3,"
                    + "\"confusion_matrix\":[[5,0],[1,4]],\"sample_gradcams\":[]}"));
            server.createContext("/compare", exchange ->
                    writeJson(exchange, "{\"dataset\":\"mnist\",\"epochs\":2,\"results\":[]}"));
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to start ai-backend stub for BDD tests", e);
        }
    }

    private static void writeJson(HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
