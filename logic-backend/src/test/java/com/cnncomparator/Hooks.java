package com.cnncomparator;

import com.cnncomparator.experiment.ExperimentRepository;
import io.cucumber.java.Before;
import org.springframework.beans.factory.annotation.Autowired;

public class Hooks {

    @Autowired
    private ExperimentRepository experimentRepository;

    @Before
    public void cleanExperiments() {
        experimentRepository.deleteAll();
    }
}
