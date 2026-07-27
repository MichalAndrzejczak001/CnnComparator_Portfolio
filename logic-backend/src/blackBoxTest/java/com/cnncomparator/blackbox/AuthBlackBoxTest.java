package com.cnncomparator.blackbox;

import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;
import static org.hamcrest.Matchers.notNullValue;

class AuthBlackBoxTest extends BlackBoxTestSupport {

    @Test
    void registerThenLoginReturnsAValidToken() {
        String username = "blackbox_auth_" + System.currentTimeMillis();

        given()
                .contentType("application/json")
                .body("{\"username\":\"" + username + "\",\"password\":\"password123\"}")
        .when()
                .post("/auth/register")
        .then()
                .statusCode(201)
                .body("token", notNullValue())
                .body(matchesJsonSchemaInClasspath("schemas/auth-response.schema.json"));

        given()
                .contentType("application/json")
                .body("{\"username\":\"" + username + "\",\"password\":\"password123\"}")
        .when()
                .post("/auth/login")
        .then()
                .statusCode(200)
                .body("token", notNullValue())
                .body(matchesJsonSchemaInClasspath("schemas/auth-response.schema.json"));
    }

    @Test
    void loginWithWrongPasswordIsRejected() {
        String username = "blackbox_wrongpass_" + System.currentTimeMillis();

        given()
                .contentType("application/json")
                .body("{\"username\":\"" + username + "\",\"password\":\"password123\"}")
        .when()
                .post("/auth/register")
        .then()
                .statusCode(201);

        given()
                .contentType("application/json")
                .body("{\"username\":\"" + username + "\",\"password\":\"totally-wrong\"}")
        .when()
                .post("/auth/login")
        .then()
                .statusCode(401);
    }

    @Test
    void listExperimentsWithoutTokenIsRejected() {
        given()
        .when()
                .get("/experiments")
        .then()
                .statusCode(anyOf401Or403());
    }

    private static org.hamcrest.Matcher<Integer> anyOf401Or403() {
        return org.hamcrest.Matchers.anyOf(org.hamcrest.Matchers.is(401), org.hamcrest.Matchers.is(403));
    }
}
