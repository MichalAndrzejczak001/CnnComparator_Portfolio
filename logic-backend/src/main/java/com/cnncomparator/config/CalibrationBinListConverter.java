package com.cnncomparator.config;

import com.cnncomparator.dto.CalibrationBin;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@Converter
public class CalibrationBinListConverter implements AttributeConverter<List<CalibrationBin>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<CalibrationBin> attribute) {
        if (attribute == null) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (JacksonException e) {
            throw new RuntimeException("Failed to serialize CalibrationBin list", e);
        }
    }

    @Override
    public List<CalibrationBin> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        try {
            return MAPPER.readValue(dbData, new TypeReference<List<CalibrationBin>>() {});
        } catch (JacksonException e) {
            throw new RuntimeException("Failed to deserialize CalibrationBin list", e);
        }
    }
}
