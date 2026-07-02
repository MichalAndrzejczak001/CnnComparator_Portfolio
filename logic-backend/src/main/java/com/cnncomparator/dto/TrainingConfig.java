package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Positive;

public record TrainingConfig(

        @Positive
        int epochs,

        @JsonProperty("batch_size")
        @Positive
        int batchSize,

        @JsonProperty("learning_rate")
        @Positive
        double learningRate
) {
}
