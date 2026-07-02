package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.List;

public record ExperimentResponse(
        Long id,
        String model,
        String dataset,
        int epochs,

        @JsonProperty("batch_size")
        int batchSize,

        @JsonProperty("learning_rate")
        double learningRate,

        @JsonProperty("train_loss_per_epoch")
        List<Double> trainLossPerEpoch,

        @JsonProperty("test_loss_per_epoch")
        List<Double> testLossPerEpoch,

        @JsonProperty("test_loss")
        double testLoss,

        @JsonProperty("test_accuracy")
        double testAccuracy,

        @JsonProperty("training_time_seconds")
        double trainingTimeSeconds,

        @JsonProperty("confusion_matrix")
        List<List<Integer>> confusionMatrix,

        String note,

        @JsonProperty("model_id")
        String modelId,

        @JsonProperty("created_at")
        LocalDateTime createdAt,

        @JsonProperty("sample_gradcams")
        List<SampleGradCam> sampleGradcams
) {
}
