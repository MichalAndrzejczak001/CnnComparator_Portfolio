package com.cnncomparator.blackbox;

import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;

import static io.restassured.RestAssured.given;
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Exercises the full experiment lifecycle against a really running stack: logic-backend
 * proxies to a real ai-backend, which trains an actual (tiny, one-epoch) model on real MNIST
 * data and persists real weights. Tests are ordered and share one trained experiment,
 * since each training run costs real wall-clock time (~30-40s).
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ExperimentBlackBoxTest extends BlackBoxTestSupport {

    private String token;
    private long experimentId;

    @BeforeAll
    void registerUser() {
        token = registerAndLogin("blackbox_experiment_" + System.currentTimeMillis());
    }

    @Test
    @Order(1)
    void createExperiment_trainsARealModelOnTheLiveStack() {
        Response response = given()
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .body("""
                        {"model":"simple_cnn","dataset":"mnist","training":{"epochs":1,"batch_size":64,"learning_rate":0.001},"note":"blackbox test"}
                        """)
        .when()
                .post("/experiments")
        .then()
                .statusCode(201)
                .body("model", equalTo("simple_cnn"))
                .body("dataset", equalTo("mnist"))
                .body("test_accuracy", notNullValue())
                .body("confusion_matrix", notNullValue())
                .body(matchesJsonSchemaInClasspath("schemas/experiment-response.schema.json"))
                .extract().response();

        experimentId = response.jsonPath().getLong("id");
    }

    @Test
    @Order(2)
    void predict_classifiesAnUploadedImageWithTheRealTrainedModel() {
        given()
                .header("Authorization", "Bearer " + token)
                .multiPart("file", "digit.png", samplePngBytes(), "image/png")
        .when()
                .post("/experiments/{id}/predict", experimentId)
        .then()
                .statusCode(200)
                .body("predicted_class", notNullValue())
                .body("confidences", notNullValue());
    }

    @Test
    @Order(3)
    void gradcam_generatesAnOverlayWithTheRealTrainedModel() {
        given()
                .header("Authorization", "Bearer " + token)
                .multiPart("file", "digit.png", samplePngBytes(), "image/png")
        .when()
                .post("/experiments/{id}/gradcam", experimentId)
        .then()
                .statusCode(200);
    }

    @Test
    @Order(4)
    void listExperiments_includesTheCreatedExperiment() {
        given()
                .header("Authorization", "Bearer " + token)
        .when()
                .get("/experiments")
        .then()
                .statusCode(200)
                .body(matchesJsonSchemaInClasspath("schemas/experiment-summary-list.schema.json"))
                .body("content.id", org.hamcrest.Matchers.hasItem(((Long) experimentId).intValue()));
    }

    @Test
    @Order(5)
    void deleteExperiment_removesItPermanently() {
        given()
                .header("Authorization", "Bearer " + token)
        .when()
                .delete("/experiments/{id}", experimentId)
        .then()
                .statusCode(204);

        given()
                .header("Authorization", "Bearer " + token)
        .when()
                .get("/experiments/{id}", experimentId)
        .then()
                .statusCode(404);
    }
}
