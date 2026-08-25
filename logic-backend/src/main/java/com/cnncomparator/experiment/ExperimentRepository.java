package com.cnncomparator.experiment;

import com.cnncomparator.dto.ExperimentSummaryResponse;
import com.cnncomparator.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExperimentRepository extends JpaRepository<Experiment, Long> {

    // Projects straight into the summary DTO instead of loading full Experiment entities: the
    // list view only needs 6 columns, but Experiment also carries several large TEXT/MEDIUMTEXT
    // columns (confusion matrix, per-epoch curves, base64 Grad-CAM images) that this query would
    // otherwise pull off disk for every row just to throw them away.
    @Query("SELECT new com.cnncomparator.dto.ExperimentSummaryResponse(e.id, e.model, e.dataset, e.testAccuracy, e.createdAt, e.note) "
            + "FROM Experiment e "
            + "WHERE e.user = :user "
            + "AND (:model IS NULL OR e.model = :model) "
            + "AND (:dataset IS NULL OR e.dataset = :dataset)")
    Page<ExperimentSummaryResponse> findSummariesByUser(
            @Param("user") User user, @Param("model") String model, @Param("dataset") String dataset, Pageable pageable
    );
}
