package com.cnncomparator.experiment;

import com.cnncomparator.dto.CompareRequest;
import com.cnncomparator.dto.CompareResponse;
import com.cnncomparator.dto.ExperimentRequest;
import com.cnncomparator.dto.ExperimentResponse;
import com.cnncomparator.dto.ExperimentSummaryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/experiments")
@RequiredArgsConstructor
public class ExperimentController {

    private final ExperimentService experimentService;

    @PostMapping
    public ResponseEntity<ExperimentResponse> createExperiment(@Valid @RequestBody ExperimentRequest request,
                                                                 Authentication authentication) {
        ExperimentResponse response = experimentService.createExperiment(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ExperimentSummaryResponse>> listExperiments(Authentication authentication) {
        return ResponseEntity.ok(experimentService.listExperiments(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExperimentResponse> getExperiment(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(experimentService.getExperiment(id, authentication.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExperiment(@PathVariable Long id, Authentication authentication) {
        experimentService.deleteExperiment(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/compare")
    public ResponseEntity<CompareResponse> compareModels(@Valid @RequestBody CompareRequest request) {
        return ResponseEntity.ok(experimentService.compareModels(request));
    }
}
