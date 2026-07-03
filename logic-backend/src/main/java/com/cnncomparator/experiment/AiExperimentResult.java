package com.cnncomparator.experiment;

import com.cnncomparator.dto.SampleGradCam;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

// ai-backend's POST /experiments doesn't echo back model/dataset/training, unlike ExperimentResponse
record AiExperimentResult(

        @JsonProperty("model_id")
        String modelId,

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

        @JsonProperty("sample_gradcams")
        List<SampleGradCam> sampleGradcams
) {
}
