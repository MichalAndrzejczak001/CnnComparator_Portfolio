package com.cnncomparator.experiment;

import com.cnncomparator.dto.CompareRequest;
import com.cnncomparator.dto.CompareResponse;
import com.cnncomparator.dto.ExperimentRequest;
import com.cnncomparator.dto.ExperimentResponse;
import com.cnncomparator.dto.ExperimentSummaryResponse;
import com.cnncomparator.user.User;
import com.cnncomparator.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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
