package com.cnncomparator.experiment;

import com.cnncomparator.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExperimentRepository extends JpaRepository<Experiment, Long> {

    List<Experiment> findByUserOrderByCreatedAtDesc(User user);
}
