package com.cnncomparator.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank
        @Size(max = 100, message = "username must be at most 100 characters long")
        String username,

        @NotBlank
        @Size(min = 8, message = "password must be at least 8 characters long")
        String password
) {
}
