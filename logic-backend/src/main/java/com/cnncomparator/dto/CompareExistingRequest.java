package com.cnncomparator.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CompareExistingRequest(

        @NotEmpty
        List<Long> ids
) {
}
