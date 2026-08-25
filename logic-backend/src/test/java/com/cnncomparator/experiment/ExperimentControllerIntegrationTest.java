package com.cnncomparator.experiment;

import com.jayway.jsonpath.JsonPath;
import com.sun.net.httpserver.HttpServer;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Epic("Experiments")
@Feature("Experiment CRUD & ai-backend proxying")
class ExperimentControllerIntegrationTest {

    static HttpServer aiBackendStub;

    @Autowired
    private MockMvc mockMvc;

    @BeforeAll
    static void startStub() throws Exception {
        aiBackendStub = HttpServer.create(new InetSocketAddress(0), 0);
        aiBackendStub.createContext("/experiments", exchange -> {
            String body = "{\"status\":\"ok\",\"model_id\":\"abc-123\",\"train_loss_per_epoch\":[0.9,0.5],"
                    + "\"val_loss_per_epoch\":[0.8,0.4],\"train_accuracy_per_epoch\":[0.6,0.8],"
                    + "\"val_accuracy_per_epoch\":[0.65,0.91],\"test_loss\":0.4,\"test_accuracy\":0.91,"
                    + "\"training_time_seconds\":12.3,\"confusion_matrix\":[[5,0],[1,4]],\"sample_gradcams\":[],"
                    + "\"param_count\":62006,\"model_size_bytes\":248024,\"inference_latency_ms\":3.4,"
                    + "\"training_throughput_images_per_sec\":850.5,"
                    + "\"calibration_curve\":[{\"bin_min\":0.9,\"bin_max\":1.0,\"avg_confidence\":0.95,"
                    + "\"accuracy\":0.91,\"count\":15}]}";
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        aiBackendStub.createContext("/compare", exchange -> {
            String body = "{\"dataset\":\"mnist\",\"epochs\":2,\"results\":["
                    + "{\"model\":\"simple_cnn\",\"train_loss_per_epoch\":[0.9,0.5],\"val_loss_per_epoch\":[0.8,0.4],"
                    + "\"train_accuracy_per_epoch\":[0.6,0.8],\"val_accuracy_per_epoch\":[0.65,0.91],"
                    + "\"test_loss\":0.4,\"test_accuracy\":0.91,\"training_time_seconds\":12.3,"
                    + "\"confusion_matrix\":[[5,0],[1,4]],\"param_count\":62006,\"model_size_bytes\":248024,"
                    + "\"inference_latency_ms\":3.4,"
                    + "\"training_throughput_images_per_sec\":850.5,"
                    + "\"calibration_curve\":[{\"bin_min\":0.9,\"bin_max\":1.0,\"avg_confidence\":0.95,"
                    + "\"accuracy\":0.91,\"count\":15}]}"
                    + "]}";
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

    private long createExperimentAndGetId(String token) throws Exception {
        MvcResult createResult = mockMvc.perform(post("/experiments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"model":"simple_cnn","dataset":"mnist","training":{"epochs":1,"batch_size":16,"learning_rate":0.01}}
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        Number id = JsonPath.read(createResult.getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }

    @Test
    @Story("Happy path")
    @Severity(SeverityLevel.CRITICAL)
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
                .andExpect(content().string(matchesJsonSchemaInClasspath("schemas/experiment-response.schema.json")))
                .andReturn();

        Number id = JsonPath.read(createResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/experiments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(content().string(matchesJsonSchemaInClasspath("schemas/experiment-summary-list.schema.json")));

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
    @Story("Authorization")
    @Severity(SeverityLevel.CRITICAL)
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
    @Story("Authorization")
    @Severity(SeverityLevel.CRITICAL)
    void experimentsEndpointRequiresAuthentication() throws Exception {
        MvcResult result = mockMvc.perform(get("/experiments")).andReturn();

        assertThat(result.getResponse().getStatus()).isIn(401, 403);
    }

    @Test
    @Story("Happy path")
    @Severity(SeverityLevel.NORMAL)
    void compareModelsProxiesToAiBackend() throws Exception {
        String token = registerAndGetToken("compare_user");

        mockMvc.perform(post("/experiments/compare")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dataset":"mnist","training":{"epochs":2,"batch_size":32,"learning_rate":0.001}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dataset").value("mnist"))
                .andExpect(content().string(matchesJsonSchemaInClasspath("schemas/compare-response.schema.json")));
    }

    @Test
    @Story("Negative")
    @Severity(SeverityLevel.NORMAL)
    void createExperimentRejectsUnknownModel() throws Exception {
        String token = registerAndGetToken("invalid_model_user");

        mockMvc.perform(post("/experiments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"model":"not_a_real_model","dataset":"mnist","training":{"epochs":1,"batch_size":16,"learning_rate":0.01}}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Story("Negative")
    @Severity(SeverityLevel.NORMAL)
    void createExperimentRejectsUnknownDataset() throws Exception {
        String token = registerAndGetToken("invalid_dataset_user");

        mockMvc.perform(post("/experiments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"model":"simple_cnn","dataset":"not_a_real_dataset","training":{"epochs":1,"batch_size":16,"learning_rate":0.01}}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Story("Negative")
    @Severity(SeverityLevel.NORMAL)
    void predictRejectsNonExistentExperiment() throws Exception {
        String token = registerAndGetToken("predict_missing_experiment_user");
        MockMultipartFile file = new MockMultipartFile("file", "digit.png", MediaType.IMAGE_PNG_VALUE, new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/experiments/{id}/predict", 999_999L)
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @Story("Authorization")
    @Severity(SeverityLevel.CRITICAL)
    void predictRejectsExperimentNotOwnedByCaller() throws Exception {
        String ownerToken = registerAndGetToken("predict_owner_user");
        String otherToken = registerAndGetToken("predict_other_user");
        long id = createExperimentAndGetId(ownerToken);
        MockMultipartFile file = new MockMultipartFile("file", "digit.png", MediaType.IMAGE_PNG_VALUE, new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/experiments/{id}/predict", id)
                        .file(file)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Story("Destructive")
    @Severity(SeverityLevel.NORMAL)
    void predictRejectsRequestMissingFilePart() throws Exception {
        String token = registerAndGetToken("predict_missing_file_user");
        long id = createExperimentAndGetId(token);

        mockMvc.perform(multipart("/experiments/{id}/predict", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Story("Authorization")
    @Severity(SeverityLevel.CRITICAL)
    void gradcamRejectsExperimentNotOwnedByCaller() throws Exception {
        String ownerToken = registerAndGetToken("gradcam_owner_user");
        String otherToken = registerAndGetToken("gradcam_other_user");
        long id = createExperimentAndGetId(ownerToken);
        MockMultipartFile file = new MockMultipartFile("file", "digit.png", MediaType.IMAGE_PNG_VALUE, new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/experiments/{id}/gradcam", id)
                        .file(file)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Story("Happy path")
    @Severity(SeverityLevel.NORMAL)
    void rerunExperimentCreatesANewExperimentWithTheSameConfig() throws Exception {
        String token = registerAndGetToken("rerun_user");
        long originalId = createExperimentAndGetId(token);

        MvcResult rerunResult = mockMvc.perform(post("/experiments/{id}/rerun", originalId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.model").value("simple_cnn"))
                .andExpect(jsonPath("$.dataset").value("mnist"))
                .andExpect(content().string(matchesJsonSchemaInClasspath("schemas/experiment-response.schema.json")))
                .andReturn();

        Number newId = JsonPath.read(rerunResult.getResponse().getContentAsString(), "$.id");
        assertThat(newId.longValue()).isNotEqualTo(originalId);

        mockMvc.perform(get("/experiments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @Story("Authorization")
    @Severity(SeverityLevel.CRITICAL)
    void rerunExperimentRejectsExperimentNotOwnedByCaller() throws Exception {
        String ownerToken = registerAndGetToken("rerun_owner_user");
        String otherToken = registerAndGetToken("rerun_other_user");
        long id = createExperimentAndGetId(ownerToken);

        mockMvc.perform(post("/experiments/{id}/rerun", id)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Story("Happy path")
    @Severity(SeverityLevel.NORMAL)
    void updateNoteChangesTheStoredNote() throws Exception {
        String token = registerAndGetToken("note_user");
        long id = createExperimentAndGetId(token);

        mockMvc.perform(patch("/experiments/{id}/note", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"note":"updated after training"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.note").value("updated after training"))
                .andExpect(content().string(matchesJsonSchemaInClasspath("schemas/experiment-response.schema.json")));

        mockMvc.perform(get("/experiments/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.note").value("updated after training"));
    }

    @Test
    @Story("Authorization")
    @Severity(SeverityLevel.CRITICAL)
    void updateNoteRejectsExperimentNotOwnedByCaller() throws Exception {
        String ownerToken = registerAndGetToken("note_owner_user");
        String otherToken = registerAndGetToken("note_other_user");
        long id = createExperimentAndGetId(ownerToken);

        mockMvc.perform(patch("/experiments/{id}/note", id)
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"note":"not mine to change"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @Story("Happy path")
    @Severity(SeverityLevel.NORMAL)
    void compareExistingExperimentsReturnsTheRequestedOwnedExperiments() throws Exception {
        String token = registerAndGetToken("compare_existing_user");
        long firstId = createExperimentAndGetId(token);
        long secondId = createExperimentAndGetId(token);

        mockMvc.perform(post("/experiments/compare-existing")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[" + firstId + "," + secondId + "]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].model").value("simple_cnn"));
    }

    @Test
    @Story("Authorization")
    @Severity(SeverityLevel.CRITICAL)
    void compareExistingExperimentsRejectsAnExperimentNotOwnedByCaller() throws Exception {
        String ownerToken = registerAndGetToken("compare_existing_owner_user");
        String otherToken = registerAndGetToken("compare_existing_other_user");
        long id = createExperimentAndGetId(ownerToken);

        mockMvc.perform(post("/experiments/compare-existing")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[" + id + "]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Story("Destructive")
    @Severity(SeverityLevel.NORMAL)
    void compareExistingExperimentsRejectsEmptyIdList() throws Exception {
        String token = registerAndGetToken("compare_existing_empty_user");

        mockMvc.perform(post("/experiments/compare-existing")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[]}"))
                .andExpect(status().isBadRequest());
    }
}
