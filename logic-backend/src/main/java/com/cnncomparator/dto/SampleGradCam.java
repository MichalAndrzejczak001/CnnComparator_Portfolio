package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
public class SampleGradCam {

    @JsonProperty("true_label")
    public String trueLabel;

    @JsonProperty("predicted_label")
    public String predictedLabel;

    public double confidence;

    @JsonProperty("gradcam_image")
    public String gradcamImage;
}
