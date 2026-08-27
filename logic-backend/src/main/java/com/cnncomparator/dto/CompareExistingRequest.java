package com.cnncomparator.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CompareExistingRequest(

        @NotEmpty
        @Size(max = 50, message = "ids must contain at most 50 entries")
        List<Long> ids
) {
}
