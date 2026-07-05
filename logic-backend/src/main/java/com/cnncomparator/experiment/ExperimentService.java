package com.cnncomparator.experiment;

import com.cnncomparator.dto.CompareRequest;
import com.cnncomparator.dto.CompareResponse;
import com.cnncomparator.dto.ExperimentRequest;
import com.cnncomparator.dto.ExperimentResponse;
import com.cnncomparator.dto.ExperimentSummaryResponse;
import com.cnncomparator.dto.GradCamResponse;
import com.cnncomparator.dto.PredictResponse;
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
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class ExperimentService {

    private final ExperimentRepository experimentRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${ai-backend.url}")
    private String aiBackendUrl;

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
                .testLossPerEpoch(result.testLossPerEpoch())
                .testLoss(result.testLoss())
                .testAccuracy(result.testAccuracy())
                .trainingTimeSeconds(result.trainingTimeSeconds())
                .confusionMatrix(result.confusionMatrix())
                .note(request.note())
                .modelId(result.modelId())
                .createdAt(LocalDateTime.now())
                .sampleGradcams(result.sampleGradcams())
                .build();

        experimentRepository.save(experiment);
        return toResponse(experiment);
    }

    public List<ExperimentSummaryResponse> listExperiments(String username) {
        User user = findUser(username);

        return experimentRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toSummary)
                .toList();
    }

    public ExperimentResponse getExperiment(Long id, String username) {
        Experiment experiment = findExperiment(id);
        assertOwner(experiment, username);
        return toResponse(experiment);
    }

    public void deleteExperiment(Long id, String username) {
        Experiment experiment = findExperiment(id);
        assertOwner(experiment, username);
        experimentRepository.delete(experiment);
    }

    public CompareResponse compareModels(CompareRequest request) {
        return restTemplate.postForObject(aiBackendUrl + "/compare", request, CompareResponse.class);
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
                e.getTrainLossPerEpoch(), e.getTestLossPerEpoch(), e.getTestLoss(), e.getTestAccuracy(),
                e.getTrainingTimeSeconds(), e.getConfusionMatrix(), e.getNote(), e.getModelId(),
                e.getCreatedAt(), e.getSampleGradcams()
        );
    }

    private ExperimentSummaryResponse toSummary(Experiment e) {
        return new ExperimentSummaryResponse(
                e.getId(), e.getModel(), e.getDataset(), e.getTestAccuracy(), e.getCreatedAt(), e.getNote()
        );
    }
}
