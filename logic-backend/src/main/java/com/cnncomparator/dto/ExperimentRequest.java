package com.cnncomparator.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ExperimentRequest(

        @NotBlank
        String model,

        @NotBlank
        String dataset,

        @NotNull
        @Valid
        TrainingConfig training,

        String note
) {
}
