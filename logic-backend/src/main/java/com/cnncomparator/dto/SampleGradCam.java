package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SampleGradCam(

        @JsonProperty("true_label")
        String trueLabel,

        @JsonProperty("predicted_label")
        String predictedLabel,

        double confidence,

        @JsonProperty("gradcam_image")
        String gradcamImage
) {
}
