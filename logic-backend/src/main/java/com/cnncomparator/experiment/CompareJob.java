package com.cnncomparator.experiment;

import com.cnncomparator.dto.CompareResultItem;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

class CompareJob {

    enum Status {
        PENDING, RUNNING, COMPLETED, FAILED
    }

    private final String id;
    private final String username;
    private final String dataset;
    private final int epochs;
    private final List<CompareResultItem> results = new CopyOnWriteArrayList<>();

    private volatile Status status = Status.PENDING;
    private volatile String currentModel;
    private volatile String error;

    // Set once the job reaches a terminal status, so CompareJobService can evict jobs that
    // finished long ago instead of keeping every job in memory for the life of the process.
    private volatile Instant finishedAt;

    CompareJob(String id, String username, String dataset, int epochs) {
        this.id = id;
        this.username = username;
        this.dataset = dataset;
        this.epochs = epochs;
    }

    String getId() {
        return id;
    }

    String getUsername() {
        return username;
    }

    String getDataset() {
        return dataset;
    }

    int getEpochs() {
        return epochs;
    }

    Status getStatus() {
        return status;
    }

    void setStatus(Status status) {
        this.status = status;
        if (status == Status.COMPLETED || status == Status.FAILED) {
            this.finishedAt = Instant.now();
        }
    }

    Instant getFinishedAt() {
        return finishedAt;
    }

    String getCurrentModel() {
        return currentModel;
    }

    void setCurrentModel(String currentModel) {
        this.currentModel = currentModel;
    }

    String getError() {
        return error;
    }

    void setError(String error) {
        this.error = error;
    }

    List<CompareResultItem> getResults() {
        return results;
    }

    void addResult(CompareResultItem result) {
        results.add(result);
    }
}
