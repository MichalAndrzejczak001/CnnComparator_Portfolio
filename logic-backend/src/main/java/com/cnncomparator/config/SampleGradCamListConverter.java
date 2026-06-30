package com.cnncomparator.config;

import com.cnncomparator.dto.SampleGradCam;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@Converter
public class SampleGradCamListConverter implements AttributeConverter<List<SampleGradCam>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<SampleGradCam> attribute) {
        if (attribute == null) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (JacksonException e) {
            throw new RuntimeException("Failed to serialize SampleGradCam list", e);
        }
    }

    @Override
    public List<SampleGradCam> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        try {
            return MAPPER.readValue(dbData, new TypeReference<List<SampleGradCam>>() {});
        } catch (JacksonException e) {
            throw new RuntimeException("Failed to deserialize SampleGradCam list", e);
        }
    }
}
