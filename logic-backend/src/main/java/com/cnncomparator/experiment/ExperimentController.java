package com.cnncomparator.experiment;

import com.cnncomparator.dto.CompareExistingRequest;
import com.cnncomparator.dto.CompareJobStartedResponse;
import com.cnncomparator.dto.CompareJobStatus;
import com.cnncomparator.dto.CompareRequest;
import com.cnncomparator.dto.CompareResponse;
import com.cnncomparator.dto.ExperimentRequest;
import com.cnncomparator.dto.ExperimentResponse;
import com.cnncomparator.dto.ExperimentSummaryResponse;
import com.cnncomparator.dto.GradCamResponse;
import com.cnncomparator.dto.NoteRequest;
import com.cnncomparator.dto.PageResponse;
import com.cnncomparator.dto.PredictResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/experiments")
@RequiredArgsConstructor
public class ExperimentController {

    private final ExperimentService experimentService;
    private final CompareJobService compareJobService;

    @PostMapping
    public ResponseEntity<ExperimentResponse> createExperiment(@Valid @RequestBody ExperimentRequest request,
                                                                 Authentication authentication) {
        ExperimentResponse response = experimentService.createExperiment(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<ExperimentSummaryResponse>> listExperiments(
            Authentication authentication,
            @RequestParam(required = false) String model,
            @RequestParam(required = false) String dataset,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ExperimentSummaryResponse> page = experimentService.listExperiments(authentication.getName(), model, dataset, pageable);
        return ResponseEntity.ok(PageResponse.from(page));
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

    @PostMapping("/compare/jobs")
    public ResponseEntity<CompareJobStartedResponse> startCompareJob(@Valid @RequestBody CompareRequest request,
                                                                       Authentication authentication) {
        String jobId = compareJobService.startJob(request, authentication.getName());
        return ResponseEntity.accepted().body(new CompareJobStartedResponse(jobId));
    }

    @GetMapping("/compare/jobs/{jobId}")
    public ResponseEntity<CompareJobStatus> getCompareJob(@PathVariable String jobId, Authentication authentication) {
        return ResponseEntity.ok(compareJobService.getStatus(jobId, authentication.getName()));
    }

    @PostMapping("/compare-existing")
    public ResponseEntity<List<ExperimentResponse>> compareExistingExperiments(
            @Valid @RequestBody CompareExistingRequest request, Authentication authentication) {
        return ResponseEntity.ok(experimentService.compareExistingExperiments(request.ids(), authentication.getName()));
    }

    @PostMapping("/{id}/rerun")
    public ResponseEntity<ExperimentResponse> rerunExperiment(@PathVariable Long id, Authentication authentication) {
        ExperimentResponse response = experimentService.rerunExperiment(id, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}/note")
    public ResponseEntity<ExperimentResponse> updateNote(@PathVariable Long id,
                                                          @Valid @RequestBody NoteRequest request,
                                                          Authentication authentication) {
        return ResponseEntity.ok(experimentService.updateNote(id, authentication.getName(), request.note()));
    }

    @PostMapping(value = "/{id}/predict", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PredictResponse> predict(@PathVariable Long id,
                                                    @RequestParam("file") MultipartFile file,
                                                    Authentication authentication) throws IOException {
        return ResponseEntity.ok(experimentService.predict(id, authentication.getName(), file));
    }

    @PostMapping(value = "/{id}/gradcam", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GradCamResponse> gradcam(@PathVariable Long id,
                                                    @RequestParam("file") MultipartFile file,
                                                    Authentication authentication) throws IOException {
        return ResponseEntity.ok(experimentService.generateGradCam(id, authentication.getName(), file));
    }
}
