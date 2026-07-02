package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record PredictResponse(

        @JsonProperty("predicted_class")
        String predictedClass,

        @JsonProperty("predicted_index")
        int predictedIndex,

        List<ClassConfidence> confidences
) {
}
