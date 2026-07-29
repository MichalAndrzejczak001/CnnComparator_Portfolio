package com.cnncomparator.dto;

import jakarta.validation.constraints.Size;

public record NoteRequest(

        @Size(max = 1000)
        String note
) {
}
