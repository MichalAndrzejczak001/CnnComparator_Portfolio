package com.cnncomparator.config;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void aiBackendRejectingTheRequestIsReportedAsBadRequestNotAnOutage() {
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.UNPROCESSABLE_ENTITY, "Unprocessable Entity", HttpHeaders.EMPTY,
                "{\"detail\":\"invalid model name\"}".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);

        ProblemDetail problem = handler.handleAiBackendRejection(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getDetail()).contains("invalid model name");
    }

    @Test
    void aiBackendBeingUnreachableIsStillReportedAsBadGateway() {
        ProblemDetail problem = handler.handleAiBackendFailure(new ResourceAccessException("connection refused"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY.value());
    }
}
