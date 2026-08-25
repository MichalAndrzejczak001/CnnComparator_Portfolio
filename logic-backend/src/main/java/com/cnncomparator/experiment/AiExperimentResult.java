package com.cnncomparator.experiment;

import com.cnncomparator.dto.CalibrationBin;
import com.cnncomparator.dto.SampleGradCam;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

// ai-backend's POST /experiments doesn't echo back model/dataset/training, unlike ExperimentResponse
record AiExperimentResult(

        @JsonProperty("model_id")
        String modelId,

        @JsonProperty("train_loss_per_epoch")
        List<Double> trainLossPerEpoch,

        @JsonProperty("val_loss_per_epoch")
        List<Double> valLossPerEpoch,

        @JsonProperty("train_accuracy_per_epoch")
        List<Double> trainAccuracyPerEpoch,

        @JsonProperty("val_accuracy_per_epoch")
        List<Double> valAccuracyPerEpoch,

        @JsonProperty("test_loss")
        double testLoss,

        @JsonProperty("test_accuracy")
        double testAccuracy,

        @JsonProperty("training_time_seconds")
        double trainingTimeSeconds,

        @JsonProperty("confusion_matrix")
        List<List<Integer>> confusionMatrix,

        @JsonProperty("sample_gradcams")
        List<SampleGradCam> sampleGradcams,

        @JsonProperty("param_count")
        long paramCount,

        @JsonProperty("model_size_bytes")
        long modelSizeBytes,

        @JsonProperty("inference_latency_ms")
        double inferenceLatencyMs,

        @JsonProperty("training_throughput_images_per_sec")
        double trainingThroughputImagesPerSec,

        @JsonProperty("calibration_curve")
        List<CalibrationBin> calibrationCurve
) {
}
