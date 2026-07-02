package com.cnncomparator.dto;

import java.util.List;

public record CompareResponse(
        String dataset,
        int epochs,
        List<CompareResultItem> results
) {
}
