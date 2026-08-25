ALTER TABLE experiments
    ADD COLUMN model_size_bytes BIGINT DEFAULT NULL AFTER param_count;
