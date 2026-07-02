package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record GradCamResponse(

        @JsonProperty("predicted_class")
        String predictedClass,

        @JsonProperty("predicted_index")
        int predictedIndex,

        List<ClassConfidence> confidences,

        @JsonProperty("gradcam_image")
        String gradcamImage
) {
}
