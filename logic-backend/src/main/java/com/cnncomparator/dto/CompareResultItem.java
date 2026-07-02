package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record CompareResultItem(
        String model,

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
        List<List<Integer>> confusionMatrix
) {
}
