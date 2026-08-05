package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
public class CalibrationBin {

    @JsonProperty("bin_min")
    public double binMin;

    @JsonProperty("bin_max")
    public double binMax;

    @JsonProperty("avg_confidence")
    public Double avgConfidence;

    public Double accuracy;

    public int count;
}
