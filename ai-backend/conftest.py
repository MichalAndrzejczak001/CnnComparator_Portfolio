import uuid
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_deps():
    fixed_uuid = "550e8400-e29b-41d4-a716-446655440000"

    mock_train_loader = MagicMock()
    mock_test_loader = MagicMock()

    with (
        patch("backend.main.load_dataset") as mock_load,
        patch("backend.main.train") as mock_train,
        patch("backend.main.evaluate") as mock_eval,
        patch("backend.main.torch.save"),
        patch("backend.main._generate_sample_gradcams", return_value=[]),
        patch("backend.main.uuid.uuid4", return_value=uuid.UUID(fixed_uuid)),
    ):
        mock_load.return_value = (mock_train_loader, mock_test_loader, 10, 1, (32, 32))
        mock_train.return_value = ([0.5, 0.4, 0.3], [0.6, 0.5, 0.4], 8.0)
        mock_eval.return_value = {
            "loss": 0.3,
            "accuracy": 0.92,
            "confusion_matrix": [[9, 1], [0, 10]],
        }

        yield {"model_id": fixed_uuid}
