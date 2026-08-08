package com.cnncomparator.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank
        @Size(max = 100, message = "username must be at most 100 characters long")
        @Pattern(
                regexp = "^[a-zA-Z0-9_.-]+$",
                message = "username may only contain letters, digits, underscores, dots and hyphens"
        )
        String username,

        @NotBlank
        @Size(min = 8, message = "password must be at least 8 characters long")
        String password
) {
}
