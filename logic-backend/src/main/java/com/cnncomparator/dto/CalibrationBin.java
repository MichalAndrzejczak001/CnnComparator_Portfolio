package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CalibrationBin(

        @JsonProperty("bin_min")
        double binMin,

        @JsonProperty("bin_max")
        double binMax,

        @JsonProperty("avg_confidence")
        Double avgConfidence,

        Double accuracy,

        int count
) {
}
