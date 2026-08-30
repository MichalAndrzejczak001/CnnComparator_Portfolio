package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;

// Bounds mirror the frontend's input ranges (NewExperimentModal/ComparePage). Not meant to
// express a "valid" hyperparameter range, just to keep one request from tying up the
// training worker indefinitely.
public record TrainingConfig(

        @Positive
        @Max(100)
        int epochs,

        @JsonProperty("batch_size")
        @Positive
        @Max(512)
        int batchSize,

        @JsonProperty("learning_rate")
        @Positive
        @DecimalMax("1.0")
        double learningRate
) {
}
