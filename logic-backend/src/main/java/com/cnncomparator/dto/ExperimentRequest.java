package com.cnncomparator.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ExperimentRequest(

        // Keep in sync with ai-backend/backend/models/factory.py:MODEL_NAMES.
        @NotBlank
        @Pattern(
                regexp = "^(simple_cnn|lenet5|alexnet|vgg11|resnet18|mobilenet)$",
                message = "model must be one of: simple_cnn, lenet5, alexnet, vgg11, resnet18, mobilenet"
        )
        String model,

        // Keep in sync with the Dataset literal in ai-backend/backend/schemas.py.
        @NotBlank
        @Pattern(
                regexp = "^(mnist|cifar10|fashion_mnist)$",
                message = "dataset must be one of: mnist, cifar10, fashion_mnist"
        )
        String dataset,

        @NotNull
        @Valid
        TrainingConfig training,

        String note
) {
}
