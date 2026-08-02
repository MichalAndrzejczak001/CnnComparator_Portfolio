package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record CompareJobStatus(

        @JsonProperty("job_id")
        String jobId,

        String status,

        String dataset,

        int epochs,

        @JsonProperty("total_models")
        int totalModels,

        @JsonProperty("completed_models")
        int completedModels,

        @JsonProperty("current_model")
        String currentModel,

        List<CompareResultItem> results,

        String error
) {
}
