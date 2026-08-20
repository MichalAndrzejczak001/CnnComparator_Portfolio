package com.cnncomparator.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CompareRequest(

        // Keep in sync with the Dataset literal in ai-backend/backend/schemas.py.
        @NotBlank
        @Pattern(
                regexp = "^(mnist|cifar10|fashion_mnist)$",
                message = "dataset must be one of: mnist, cifar10, fashion_mnist"
        )
        String dataset,

        @NotNull
        @Valid
        TrainingConfig training
) {
}
