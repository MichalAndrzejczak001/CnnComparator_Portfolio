CREATE TABLE users (
    id       BIGINT       NOT NULL AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role     ENUM('ADMIN', 'USER') DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE experiments (
    id                                  BIGINT       NOT NULL AUTO_INCREMENT,
    user_id                             BIGINT       DEFAULT NULL,
    model                               VARCHAR(255) DEFAULT NULL,
    dataset                             VARCHAR(255) DEFAULT NULL,
    epochs                              INT          NOT NULL,
    batch_size                          INT          NOT NULL,
    learning_rate                       DOUBLE       NOT NULL,
    train_loss_per_epoch                TEXT,
    val_loss_per_epoch                  TEXT,
    train_accuracy_per_epoch            TEXT,
    val_accuracy_per_epoch              TEXT,
    test_loss                           DOUBLE       NOT NULL,
    test_accuracy                       DOUBLE       NOT NULL,
    training_time_seconds               DOUBLE       NOT NULL,
    confusion_matrix                    TEXT,
    note                                VARCHAR(1000) DEFAULT NULL,
    model_id                            VARCHAR(255) DEFAULT NULL,
    created_at                          DATETIME(6)  DEFAULT NULL,
    sample_gradcams                     MEDIUMTEXT,
    param_count                         BIGINT       DEFAULT NULL,
    inference_latency_ms                DOUBLE       DEFAULT NULL,
    training_throughput_images_per_sec  DOUBLE       DEFAULT NULL,
    calibration_curve                   TEXT,
    PRIMARY KEY (id),
    KEY fk_experiments_user (user_id),
    CONSTRAINT fk_experiments_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
