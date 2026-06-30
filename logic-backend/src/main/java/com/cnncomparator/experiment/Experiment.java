package com.cnncomparator.experiment;

import com.cnncomparator.config.DoubleListConverter;
import com.cnncomparator.config.IntMatrixConverter;
import com.cnncomparator.config.SampleGradCamListConverter;
import com.cnncomparator.dto.SampleGradCam;
import com.cnncomparator.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "experiments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Experiment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String model;
    private String dataset;
    private int epochs;
    private int batchSize;
    private double learningRate;

    @Convert(converter = DoubleListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<Double> trainLossPerEpoch;

    @Convert(converter = DoubleListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<Double> testLossPerEpoch;

    private double testLoss;
    private double testAccuracy;
    private double trainingTimeSeconds;

    @Convert(converter = IntMatrixConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<List<Integer>> confusionMatrix;

    @Column(length = 1000)
    private String note;

    private String modelId;

    private LocalDateTime createdAt;

    @Convert(converter = SampleGradCamListConverter.class)
    @Column(columnDefinition = "MEDIUMTEXT")
    private List<SampleGradCam> sampleGradcams;
}
