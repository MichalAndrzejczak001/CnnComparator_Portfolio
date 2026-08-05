package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record CompareResultItem(
        String model,

        @JsonProperty("train_loss_per_epoch")
        List<Double> trainLossPerEpoch,

        @JsonProperty("val_loss_per_epoch")
        List<Double> valLossPerEpoch,

        @JsonProperty("test_loss")
        double testLoss,

        @JsonProperty("test_accuracy")
        double testAccuracy,

        @JsonProperty("training_time_seconds")
        double trainingTimeSeconds,

        @JsonProperty("confusion_matrix")
        List<List<Integer>> confusionMatrix,

        @JsonProperty("param_count")
        long paramCount,

        @JsonProperty("inference_latency_ms")
        double inferenceLatencyMs,

        @JsonProperty("training_throughput_images_per_sec")
        double trainingThroughputImagesPerSec,

        @JsonProperty("calibration_curve")
        List<CalibrationBin> calibrationCurve
) {
}
