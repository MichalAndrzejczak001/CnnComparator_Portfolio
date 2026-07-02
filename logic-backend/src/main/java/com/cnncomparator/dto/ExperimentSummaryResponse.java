package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record ExperimentSummaryResponse(
        Long id,
        String model,
        String dataset,

        @JsonProperty("test_accuracy")
        double testAccuracy,

        @JsonProperty("created_at")
        LocalDateTime createdAt,

        String note
) {
}
