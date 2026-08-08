package com.cnncomparator.experiment;

import com.cnncomparator.dto.CompareRequest;
import com.cnncomparator.dto.CompareResponse;
import com.cnncomparator.dto.ExperimentRequest;
import com.cnncomparator.dto.ExperimentResponse;
import com.cnncomparator.dto.ExperimentSummaryResponse;
import com.cnncomparator.dto.GradCamResponse;
import com.cnncomparator.dto.PredictResponse;
import com.cnncomparator.dto.TrainingConfig;
import com.cnncomparator.user.User;
import com.cnncomparator.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExperimentService {

    private final ExperimentRepository experimentRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${ai-backend.url}")
    private String aiBackendUrl;

    // Deliberately not @Transactional: it calls out to ai-backend first, which can run for
    // minutes (see RestTemplateConfig's read timeout). Holding a DB transaction/connection
    // open for that long would starve the connection pool for no benefit — the only DB work
    // here is the final save(), which Spring Data already runs in its own short transaction.
    public ExperimentResponse createExperiment(ExperimentRequest request, String username) {
        User user = findUser(username);

        AiExperimentResult result = restTemplate.postForObject(
                aiBackendUrl + "/experiments", request, AiExperimentResult.class
        );

        Experiment experiment = Experiment.builder()
                .user(user)
                .model(request.model())
                .dataset(request.dataset())
                .epochs(request.training().epochs())
                .batchSize(request.training().batchSize())
                .learningRate(request.training().learningRate())
                .trainLossPerEpoch(result.trainLossPerEpoch())
                .valLossPerEpoch(result.valLossPerEpoch())
                .trainAccuracyPerEpoch(result.trainAccuracyPerEpoch())
                .valAccuracyPerEpoch(result.valAccuracyPerEpoch())
                .testLoss(result.testLoss())
                .testAccuracy(result.testAccuracy())
                .trainingTimeSeconds(result.trainingTimeSeconds())
                .confusionMatrix(result.confusionMatrix())
                .note(request.note())
                .modelId(result.modelId())
                .createdAt(LocalDateTime.now())
                .sampleGradcams(result.sampleGradcams())
                .paramCount(result.paramCount())
                .inferenceLatencyMs(result.inferenceLatencyMs())
                .trainingThroughputImagesPerSec(result.trainingThroughputImagesPerSec())
                .calibrationCurve(result.calibrationCurve())
                .build();

        experimentRepository.save(experiment);
        return toResponse(experiment);
    }

    @Transactional(readOnly = true)
    public List<ExperimentSummaryResponse> listExperiments(String username) {
        User user = findUser(username);

        return experimentRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExperimentResponse getExperiment(Long id, String username) {
        Experiment experiment = findExperiment(id);
        assertOwner(experiment, username);
        return toResponse(experiment);
    }

    @Transactional
    public void deleteExperiment(Long id, String username) {
        Experiment experiment = findExperiment(id);
        assertOwner(experiment, username);
        experimentRepository.delete(experiment);
    }

    public CompareResponse compareModels(CompareRequest request) {
        return restTemplate.postForObject(aiBackendUrl + "/compare", request, CompareResponse.class);
    }

    @Transactional(readOnly = true)
    public List<ExperimentResponse> compareExistingExperiments(List<Long> ids, String username) {
        Map<Long, Experiment> byId = experimentRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Experiment::getId, experiment -> experiment));

        return ids.stream()
                .map(id -> {
                    Experiment experiment = byId.get(id);
                    if (experiment == null) {
                        throw new NoSuchElementException("Experiment not found: " + id);
                    }
                    assertOwner(experiment, username);
                    return experiment;
                })
                .map(this::toResponse)
                .toList();
    }

    public ExperimentResponse rerunExperiment(Long id, String username) {
        Experiment original = findExperiment(id);
        assertOwner(original, username);

        ExperimentRequest request = new ExperimentRequest(
                original.getModel(),
                original.getDataset(),
                new TrainingConfig(original.getEpochs(), original.getBatchSize(), original.getLearningRate()),
                null
        );

        return createExperiment(request, username);
    }

    @Transactional
    public ExperimentResponse updateNote(Long id, String username, String note) {
        Experiment experiment = findExperiment(id);
        assertOwner(experiment, username);
        experiment.setNote(note);
        experimentRepository.save(experiment);
        return toResponse(experiment);
    }

    public PredictResponse predict(Long id, String username, MultipartFile file) throws IOException {
        Experiment experiment = findExperiment(id);
        assertOwner(experiment, username);

        return restTemplate.postForObject(
                aiBackendUrl + "/predict", buildInferenceRequest(experiment, file), PredictResponse.class
        );
    }

    public GradCamResponse generateGradCam(Long id, String username, MultipartFile file) throws IOException {
        Experiment experiment = findExperiment(id);
        assertOwner(experiment, username);

        return restTemplate.postForObject(
                aiBackendUrl + "/gradcam", buildInferenceRequest(experiment, file), GradCamResponse.class
        );
    }

    private HttpEntity<MultiValueMap<String, Object>> buildInferenceRequest(Experiment experiment, MultipartFile file)
            throws IOException {
        ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename();
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_name", experiment.getModel());
        body.add("dataset", experiment.getDataset());
        body.add("model_id", experiment.getModelId());
        body.add("file", fileResource);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        return new HttpEntity<>(body, headers);
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    private Experiment findExperiment(Long id) {
        return experimentRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Experiment not found: " + id));
    }

    private void assertOwner(Experiment experiment, String username) {
        if (!experiment.getUser().getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this experiment");
        }
    }

    private ExperimentResponse toResponse(Experiment e) {
        return new ExperimentResponse(
                e.getId(), e.getModel(), e.getDataset(), e.getEpochs(), e.getBatchSize(), e.getLearningRate(),
                e.getTrainLossPerEpoch(), e.getValLossPerEpoch(), e.getTrainAccuracyPerEpoch(), e.getValAccuracyPerEpoch(),
                e.getTestLoss(), e.getTestAccuracy(),
                e.getTrainingTimeSeconds(), e.getConfusionMatrix(), e.getNote(), e.getModelId(),
                e.getCreatedAt(), e.getSampleGradcams(),
                e.getParamCount() != null ? e.getParamCount() : 0L,
                e.getInferenceLatencyMs() != null ? e.getInferenceLatencyMs() : 0.0,
                e.getTrainingThroughputImagesPerSec() != null ? e.getTrainingThroughputImagesPerSec() : 0.0,
                e.getCalibrationCurve()
        );
    }

    private ExperimentSummaryResponse toSummary(Experiment e) {
        return new ExperimentSummaryResponse(
                e.getId(), e.getModel(), e.getDataset(), e.getTestAccuracy(), e.getCreatedAt(), e.getNote()
        );
    }
}
