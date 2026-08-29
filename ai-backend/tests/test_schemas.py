from typing import get_args

import pytest
from pydantic import ValidationError

from backend.models.factory import MODEL_NAMES
from backend.schemas import CompareConfig, ExperimentConfig, TrainingConfig


def test_experiment_config_model_literal_matches_model_factories():
    allowed = get_args(ExperimentConfig.model_fields["model"].annotation)
    assert set(allowed) == set(MODEL_NAMES)


def test_experiment_config_and_compare_config_agree_on_dataset_literal():
    experiment_datasets = get_args(ExperimentConfig.model_fields["dataset"].annotation)
    compare_datasets = get_args(CompareConfig.model_fields["dataset"].annotation)
    assert set(experiment_datasets) == set(compare_datasets)


@pytest.mark.parametrize(
    "overrides",
    [
        {"batch_size": 0},
        {"batch_size": -1},
        {"epochs": 0},
        {"epochs": 100_000_000},
        {"learning_rate": 0},
        {"learning_rate": 5.0},
    ],
)
def test_training_config_rejects_out_of_range_values(overrides):
    with pytest.raises(ValidationError):
        TrainingConfig(**overrides)
