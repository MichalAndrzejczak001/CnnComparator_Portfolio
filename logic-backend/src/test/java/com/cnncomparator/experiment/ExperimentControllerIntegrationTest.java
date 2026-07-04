package com.cnncomparator.experiment;

import com.jayway.jsonpath.JsonPath;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExperimentControllerIntegrationTest {

    static HttpServer aiBackendStub;

    @Autowired
    private MockMvc mockMvc;

    @BeforeAll
    static void startStub() throws Exception {
        aiBackendStub = HttpServer.create(new InetSocketAddress(0), 0);
        aiBackendStub.createContext("/experiments", exchange -> {
            String body = "{\"status\":\"ok\",\"model_id\":\"abc-123\",\"train_loss_per_epoch\":[0.9,0.5],"
                    + "\"test_loss_per_epoch\":[0.8,0.4],\"test_loss\":0.4,\"test_accuracy\":0.91,"
                    + "\"training_time_seconds\":12.3,\"confusion_matrix\":[[5,0],[1,4]],\"sample_gradcams\":[]}";
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        aiBackendStub.createContext("/compare", exchange -> {
            String body = "{\"dataset\":\"mnist\",\"epochs\":2,\"results\":[]}";
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        aiBackendStub.start();
    }

    @AfterAll
    static void stopStub() {
        aiBackendStub.stop(0);
    }

    @DynamicPropertySource
    static void aiBackendUrl(DynamicPropertyRegistry registry) {
        registry.add("ai-backend.url", () -> "http://localhost:" + aiBackendStub.getAddress().getPort());
    }

    private String registerAndGetToken(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    @Test
    void createListGetAndDeleteExperiment() throws Exception {
        String token = registerAndGetToken("experiment_owner");

        MvcResult createResult = mockMvc.perform(post("/experiments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"model":"simple_cnn","dataset":"mnist","training":{"epochs":2,"batch_size":32,"learning_rate":0.001},"note":"integration test"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.model_id").value("abc-123"))
                .andExpect(jsonPath("$.test_accuracy").value(0.91))
                .andReturn();

        Number id = JsonPath.read(createResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/experiments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(get("/experiments/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.model").value("simple_cnn"));

        mockMvc.perform(delete("/experiments/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/experiments/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void experimentIsNotVisibleToOtherUsers() throws Exception {
        String ownerToken = registerAndGetToken("owner_user");
        String otherToken = registerAndGetToken("other_user");

        MvcResult createResult = mockMvc.perform(post("/experiments")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"model":"lenet5","dataset":"mnist","training":{"epochs":1,"batch_size":16,"learning_rate":0.01}}
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        Number id = JsonPath.read(createResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/experiments/" + id)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void experimentsEndpointRequiresAuthentication() throws Exception {
        MvcResult result = mockMvc.perform(get("/experiments")).andReturn();

        assertThat(result.getResponse().getStatus()).isIn(401, 403);
    }

    @Test
    void compareModelsProxiesToAiBackend() throws Exception {
        String token = registerAndGetToken("compare_user");

        mockMvc.perform(post("/experiments/compare")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dataset":"mnist","training":{"epochs":2,"batch_size":32,"learning_rate":0.001}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dataset").value("mnist"));
    }
}
