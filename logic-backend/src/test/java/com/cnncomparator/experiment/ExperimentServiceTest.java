package com.cnncomparator.experiment;

import com.cnncomparator.dto.CalibrationBin;
import com.cnncomparator.dto.CompareRequest;
import com.cnncomparator.dto.CompareResponse;
import com.cnncomparator.dto.ExperimentRequest;
import com.cnncomparator.dto.ExperimentResponse;
import com.cnncomparator.dto.ExperimentSummaryResponse;
import com.cnncomparator.dto.TrainingConfig;
import com.cnncomparator.user.User;
import com.cnncomparator.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExperimentServiceTest {

    @Mock
    private ExperimentRepository experimentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RestTemplate restTemplate;

    private ExperimentService experimentService;
    private User owner;

    @BeforeEach
    void setUp() {
        experimentService = new ExperimentService(experimentRepository, userRepository, restTemplate);
        ReflectionTestUtils.setField(experimentService, "aiBackendUrl", "http://ai-backend");

        owner = User.builder().id(1L).username("michal").password("hash").build();
    }

    @Test
    void createExperimentCallsAiBackendAndPersistsResult() {
        ExperimentRequest request = new ExperimentRequest(
                "simple_cnn", "mnist", new TrainingConfig(2, 32, 0.001), "note"
        );
        AiExperimentResult aiResult = new AiExperimentResult(
                "model-123", List.of(0.9, 0.5), List.of(0.8, 0.4), List.of(0.6, 0.8), List.of(0.65, 0.91),
                0.4, 0.91, 12.3,
                List.of(List.of(5, 0), List.of(1, 4)), List.of(),
                62006L, 248024L, 3.4, 850.5,
                List.of(new CalibrationBin(0.9, 1.0, 0.95, 0.91, 15))
        );

        when(userRepository.findByUsername("michal")).thenReturn(Optional.of(owner));
        when(restTemplate.postForObject("http://ai-backend/experiments", request, AiExperimentResult.class))
                .thenReturn(aiResult);

        ExperimentResponse response = experimentService.createExperiment(request, "michal");

        assertThat(response.modelId()).isEqualTo("model-123");
        assertThat(response.testAccuracy()).isEqualTo(0.91);
        assertThat(response.model()).isEqualTo("simple_cnn");
        assertThat(response.paramCount()).isEqualTo(62006L);
        assertThat(response.modelSizeBytes()).isEqualTo(248024L);
        assertThat(response.inferenceLatencyMs()).isEqualTo(3.4);
        assertThat(response.trainingThroughputImagesPerSec()).isEqualTo(850.5);
        assertThat(response.calibrationCurve()).hasSize(1);
        assertThat(response.calibrationCurve().get(0).accuracy).isEqualTo(0.91);
        verify(experimentRepository).save(any(Experiment.class));
    }

    @Test
    void listExperimentsReturnsSummariesForOwner() {
        Experiment experiment = Experiment.builder()
                .id(10L).user(owner).model("lenet5").dataset("mnist")
                .testAccuracy(0.85).createdAt(LocalDateTime.now()).note("note")
                .build();

        when(userRepository.findByUsername("michal")).thenReturn(Optional.of(owner));
        when(experimentRepository.findByUserOrderByCreatedAtDesc(owner)).thenReturn(List.of(experiment));

        List<ExperimentSummaryResponse> result = experimentService.listExperiments("michal");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(10L);
        assertThat(result.get(0).model()).isEqualTo("lenet5");
    }

    @Test
    void getExperimentThrowsAccessDeniedForNonOwner() {
        Experiment experiment = Experiment.builder().id(5L).user(owner).build();
        when(experimentRepository.findById(5L)).thenReturn(Optional.of(experiment));

        assertThatThrownBy(() -> experimentService.getExperiment(5L, "someoneElse"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getExperimentThrowsWhenNotFound() {
        when(experimentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> experimentService.getExperiment(99L, "michal"))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void deleteExperimentRemovesOwnedExperiment() {
        Experiment experiment = Experiment.builder().id(7L).user(owner).build();
        when(experimentRepository.findById(7L)).thenReturn(Optional.of(experiment));

        experimentService.deleteExperiment(7L, "michal");

        verify(experimentRepository).delete(experiment);
    }

    @Test
    void compareExistingExperimentsFetchesAllIdsInOneQuery() {
        Experiment e1 = Experiment.builder().id(1L).user(owner).model("simple_cnn").build();
        Experiment e2 = Experiment.builder().id(2L).user(owner).model("lenet5").build();
        when(experimentRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(e1, e2));

        List<ExperimentResponse> result = experimentService.compareExistingExperiments(List.of(1L, 2L), "michal");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(1).id()).isEqualTo(2L);
        verify(experimentRepository, never()).findById(any());
    }

    @Test
    void compareExistingExperimentsThrowsWhenAnIdIsMissing() {
        Experiment e1 = Experiment.builder().id(1L).user(owner).build();
        when(experimentRepository.findAllById(List.of(1L, 99L))).thenReturn(List.of(e1));

        assertThatThrownBy(() -> experimentService.compareExistingExperiments(List.of(1L, 99L), "michal"))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void compareExistingExperimentsThrowsAccessDeniedForNonOwnedExperiment() {
        Experiment owned = Experiment.builder().id(1L).user(owner).build();
        User someoneElse = User.builder().id(2L).username("someoneElse").password("hash").build();
        Experiment notOwned = Experiment.builder().id(2L).user(someoneElse).build();
        when(experimentRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(owned, notOwned));

        assertThatThrownBy(() -> experimentService.compareExistingExperiments(List.of(1L, 2L), "michal"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void compareModelsDelegatesToAiBackend() {
        CompareRequest request = new CompareRequest("mnist", new TrainingConfig(2, 32, 0.001));
        CompareResponse expected = new CompareResponse("mnist", 2, List.of());
        when(restTemplate.postForObject("http://ai-backend/compare", request, CompareResponse.class))
                .thenReturn(expected);

        CompareResponse response = experimentService.compareModels(request);

        assertThat(response).isEqualTo(expected);
    }
}
