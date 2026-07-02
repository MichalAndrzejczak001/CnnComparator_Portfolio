package com.cnncomparator.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CompareRequest(

        @NotBlank
        String dataset,

        @NotNull
        @Valid
        TrainingConfig training
) {
}
