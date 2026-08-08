package com.cnncomparator.experiment;

import com.cnncomparator.dto.CompareJobStatus;
import com.cnncomparator.dto.CompareRequest;
import com.cnncomparator.dto.CompareResultItem;
import com.cnncomparator.dto.ExperimentRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;

@Service
@RequiredArgsConstructor
public class CompareJobService {

    private static final List<String> MODEL_NAMES =
            List.of("simple_cnn", "lenet5", "alexnet", "vgg11", "resnet18", "mobilenet");

    private final Map<String, CompareJob> jobs = new ConcurrentHashMap<>();

    private final RestTemplate restTemplate;
    private final ExecutorService compareJobExecutor;

    @Value("${ai-backend.url}")
    private String aiBackendUrl;

    // Finished jobs stay in the map so clients can poll a final status, but nothing ever
    // reads them again after this long — without eviction the map grows without bound for
    // the life of the process.
    @Value("${compare-jobs.retention:PT1H}")
    private Duration jobRetention;

    public String startJob(CompareRequest request, String username) {
        evictExpiredJobs();

        String jobId = UUID.randomUUID().toString();
        CompareJob job = new CompareJob(jobId, username, request.dataset(), request.training().epochs());
        jobs.put(jobId, job);

        compareJobExecutor.submit(() -> runJob(job, request));

        return jobId;
    }

    private void evictExpiredJobs() {
        Instant cutoff = Instant.now().minus(jobRetention);
        jobs.values().removeIf(job -> job.getFinishedAt() != null && job.getFinishedAt().isBefore(cutoff));
    }

    public CompareJobStatus getStatus(String jobId, String username) {
        CompareJob job = jobs.get(jobId);
        if (job == null) {
            throw new NoSuchElementException("Compare job not found: " + jobId);
        }
        if (!job.getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this comparison job");
        }

        return new CompareJobStatus(
                job.getId(),
                job.getStatus().name(),
                job.getDataset(),
                job.getEpochs(),
                MODEL_NAMES.size(),
                job.getResults().size(),
                job.getCurrentModel(),
                List.copyOf(job.getResults()),
                job.getError()
        );
    }

    private void runJob(CompareJob job, CompareRequest request) {
        job.setStatus(CompareJob.Status.RUNNING);

        try {
            for (String modelName : MODEL_NAMES) {
                job.setCurrentModel(modelName);

                ExperimentRequest perModelRequest =
                        new ExperimentRequest(modelName, request.dataset(), request.training(), null);
                AiExperimentResult result = restTemplate.postForObject(
                        aiBackendUrl + "/experiments", perModelRequest, AiExperimentResult.class
                );

                job.addResult(new CompareResultItem(
                        modelName,
                        result.trainLossPerEpoch(),
                        result.valLossPerEpoch(),
                        result.trainAccuracyPerEpoch(),
                        result.valAccuracyPerEpoch(),
                        result.testLoss(),
                        result.testAccuracy(),
                        result.trainingTimeSeconds(),
                        result.confusionMatrix(),
                        result.paramCount(),
                        result.inferenceLatencyMs(),
                        result.trainingThroughputImagesPerSec(),
                        result.calibrationCurve()
                ));
            }

            job.setCurrentModel(null);
            job.setStatus(CompareJob.Status.COMPLETED);
        } catch (Exception e) {
            job.setError(e.getMessage() != null ? e.getMessage() : "Unexpected error occurred");
            job.setStatus(CompareJob.Status.FAILED);
        }
    }
}
