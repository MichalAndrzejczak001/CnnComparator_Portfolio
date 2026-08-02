package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CompareJobStartedResponse(

        @JsonProperty("job_id")
        String jobId
) {
}
