package com.cnncomparator.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class CompareJobExecutorConfig {

    @Bean(destroyMethod = "shutdown")
    public ExecutorService compareJobExecutor() {
        return Executors.newFixedThreadPool(2);
    }
}
