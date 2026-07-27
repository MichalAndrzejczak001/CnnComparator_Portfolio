package com.cnncomparator.blackbox;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeAll;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/**
 * Base for tests that hit a really running stack (docker compose up) over plain HTTP,
 * as opposed to the MockMvc-based integration tests which run the servlet container in-process.
 * Run with: docker compose up -d --build && ./gradlew blackBoxTest
 */
abstract class BlackBoxTestSupport {

    @BeforeAll
    static void configureBaseUri() {
        RestAssured.baseURI = System.getProperty("blackbox.baseUrl", "http://localhost:8080");
    }

    static String registerAndLogin(String username) {
        given()
                .contentType("application/json")
                .body("{\"username\":\"" + username + "\",\"password\":\"password123\"}")
        .when()
                .post("/auth/register")
        .then()
                .statusCode(201);

        Response response = given()
                .contentType("application/json")
                .body("{\"username\":\"" + username + "\",\"password\":\"password123\"}")
        .when()
                .post("/auth/login")
        .then()
                .statusCode(200)
                .body("token", is(org.hamcrest.Matchers.notNullValue()))
                .extract().response();

        return response.jsonPath().getString("token");
    }

    static byte[] samplePngBytes() {
        try {
            BufferedImage image = new BufferedImage(28, 28, BufferedImage.TYPE_BYTE_GRAY);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
