package com.cnncomparator.experiment;

import com.cnncomparator.dto.CompareJobStatus;
import com.cnncomparator.dto.CompareRequest;
import com.cnncomparator.dto.TrainingConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompareJobServiceTest {

    // Runs submitted jobs synchronously on the calling thread, so startJob() doesn't return
    // until runJob() has already reached a terminal status — no polling/sleeping needed to
    // observe the result in most tests.
    private static final ExecutorService DIRECT_EXECUTOR = new AbstractExecutorService() {
        @Override
        public void shutdown() {
        }

        @Override
        public List<Runnable> shutdownNow() {
            return List.of();
        }

        @Override
        public boolean isShutdown() {
            return false;
        }

        @Override
        public boolean isTerminated() {
            return false;
        }

        @Override
        public boolean awaitTermination(long timeout, TimeUnit unit) {
            return true;
        }

        @Override
        public void execute(Runnable command) {
            command.run();
        }
    };

    @Mock
    private RestTemplate restTemplate;

    private CompareJobService compareJobService;

    @BeforeEach
    void setUp() {
        compareJobService = new CompareJobService(restTemplate, DIRECT_EXECUTOR);
        ReflectionTestUtils.setField(compareJobService, "aiBackendUrl", "http://ai-backend");
        ReflectionTestUtils.setField(compareJobService, "jobRetention", Duration.ofHours(1));
    }

    private CompareRequest request() {
        return new CompareRequest("mnist", new TrainingConfig(2, 32, 0.001));
    }

    @Test
    void startJobRunsAllModelsAndCompletes() {
        when(restTemplate.postForObject(eq("http://ai-backend/experiments"), any(), eq(AiExperimentResult.class)))
                .thenReturn(new AiExperimentResult(
                        "model-1", List.of(0.9), List.of(0.8), List.of(0.6), List.of(0.65),
                        0.4, 0.91, 12.3, List.of(List.of(5, 0), List.of(1, 4)), List.of(),
                        62006L, 248024L, 3.4, 850.5, List.of()
                ));

        String jobId = compareJobService.startJob(request(), "michal");
        CompareJobStatus status = compareJobService.getStatus(jobId, "michal");

        assertThat(status.status()).isEqualTo("COMPLETED");
        assertThat(status.totalModels()).isEqualTo(6);
        assertThat(status.completedModels()).isEqualTo(6);
        assertThat(status.results()).hasSize(6);
        assertThat(status.error()).isNull();
    }

    @Test
    void startJobMarksFailedWhenAiBackendCallThrows() {
        when(restTemplate.postForObject(eq("http://ai-backend/experiments"), any(), eq(AiExperimentResult.class)))
                .thenThrow(new RestClientException("ai-backend unreachable"));

        String jobId = compareJobService.startJob(request(), "michal");
        CompareJobStatus status = compareJobService.getStatus(jobId, "michal");

        assertThat(status.status()).isEqualTo("FAILED");
        // The real exception message ("ai-backend unreachable", which could leak internal
        // details like the ai-backend URL) must not reach the client — only the log does.
        assertThat(status.error()).isEqualTo("The comparison failed due to an unexpected error");
        assertThat(status.results()).isEmpty();
    }

    @Test
    void getStatusThrowsForUnknownJob() {
        assertThatThrownBy(() -> compareJobService.getStatus("does-not-exist", "michal"))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void getStatusThrowsAccessDeniedForNonOwner() {
        when(restTemplate.postForObject(eq("http://ai-backend/experiments"), any(), eq(AiExperimentResult.class)))
                .thenThrow(new RestClientException("boom"));

        String jobId = compareJobService.startJob(request(), "michal");

        assertThatThrownBy(() -> compareJobService.getStatus(jobId, "someoneElse"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void evictsFinishedJobsOlderThanRetention() throws InterruptedException {
        ReflectionTestUtils.setField(compareJobService, "jobRetention", Duration.ofMillis(1));
        when(restTemplate.postForObject(eq("http://ai-backend/experiments"), any(), eq(AiExperimentResult.class)))
                .thenThrow(new RestClientException("boom"));

        String firstJobId = compareJobService.startJob(request(), "michal");
        Thread.sleep(20);

        // Eviction runs at the start of every startJob() call, not on a background timer.
        String secondJobId = compareJobService.startJob(request(), "michal");

        assertThatThrownBy(() -> compareJobService.getStatus(firstJobId, "michal"))
                .isInstanceOf(NoSuchElementException.class);
        assertThat(compareJobService.getStatus(secondJobId, "michal").status()).isEqualTo("FAILED");
    }
}
