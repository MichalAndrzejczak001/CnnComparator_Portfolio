import uuid
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_deps():
    fixed_uuid = "550e8400-e29b-41d4-a716-446655440000"

    mock_train_loader = MagicMock()
    mock_train_loader.__len__ = MagicMock(return_value=5)
    mock_train_loader.batch_size = 32
    mock_val_loader = MagicMock()
    mock_test_loader = MagicMock()

    with (
        patch("backend.main.load_dataset") as mock_load,
        patch("backend.main.train") as mock_train,
        patch("backend.main.evaluate") as mock_eval,
        patch("backend.main.torch.save"),
        patch("backend.main._generate_sample_gradcams", return_value=[]),
        patch("backend.main.uuid.uuid4", return_value=uuid.UUID(fixed_uuid)),
    ):
        mock_load.return_value = (mock_train_loader, mock_val_loader, mock_test_loader, 10, 1, (32, 32))
        mock_train.return_value = ([0.5, 0.4, 0.3], [0.6, 0.5, 0.4], [0.85, 0.9, 0.93], [0.82, 0.87, 0.91], 8.0)
        mock_eval.return_value = {
            "loss": 0.3,
            "accuracy": 0.92,
            "confusion_matrix": [[9, 1], [0, 10]],
            "calibration_curve": [
                {"bin_min": 0.0, "bin_max": 0.5, "avg_confidence": 0.3, "accuracy": 0.28, "count": 10},
                {"bin_min": 0.5, "bin_max": 1.0, "avg_confidence": 0.85, "accuracy": 0.9, "count": 40},
            ],
        }

        yield {"model_id": fixed_uuid}
