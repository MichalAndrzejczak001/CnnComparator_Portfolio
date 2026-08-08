from typing import get_args

from backend.models.factory import MODEL_NAMES
from backend.schemas import CompareConfig, ExperimentConfig


def test_experiment_config_model_literal_matches_model_factories():
    allowed = get_args(ExperimentConfig.model_fields["model"].annotation)
    assert set(allowed) == set(MODEL_NAMES)


def test_experiment_config_and_compare_config_agree_on_dataset_literal():
    experiment_datasets = get_args(ExperimentConfig.model_fields["dataset"].annotation)
    compare_datasets = get_args(CompareConfig.model_fields["dataset"].annotation)
    assert set(experiment_datasets) == set(compare_datasets)
