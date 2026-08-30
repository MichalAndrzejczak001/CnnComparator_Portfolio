package com.cnncomparator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.domain.Page;

import java.util.List;

// Hand-rolled instead of returning Page directly. Page/PageImpl aren't meant to be
// serialized as-is (Spring Data warns about it), and this way the JSON shape stays under
// our control instead of leaking a Spring-internal type across the wire.
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,

        @JsonProperty("total_elements")
        long totalElements,

        @JsonProperty("total_pages")
        int totalPages,

        boolean last
) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(),
                page.isLast()
        );
    }
}
