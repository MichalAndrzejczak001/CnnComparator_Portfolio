package com.cnncomparator.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Converter
public class IntMatrixConverter implements AttributeConverter<List<List<Integer>>, String> {

    @Override
    public String convertToDatabaseColumn(List<List<Integer>> attribute) {
        if (attribute == null) return null;
        return attribute.stream()
                .map(row -> row.stream().map(String::valueOf).collect(Collectors.joining(",")))
                .collect(Collectors.joining(";"));
    }

    @Override
    public List<List<Integer>> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        return Arrays.stream(dbData.split(";"))
                .map(row -> Arrays.stream(row.split(","))
                        .map(Integer::parseInt)
                        .collect(Collectors.toList()))
                .collect(Collectors.toList());
    }
}
