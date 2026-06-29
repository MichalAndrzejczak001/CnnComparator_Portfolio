import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.factory import MODEL_NAMES

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_all_six_models_accepted(mock_deps):
    for model_name in MODEL_NAMES:
        response = client.post("/experiments", json={
            "model": model_name,
            "dataset": "mnist",
            "training": {"epochs": 1, "batch_size": 32, "learning_rate": 0.001},
        })
        assert response.status_code == 200, f"Model {model_name} was rejected"


def test_experiment_response_has_required_fields(mock_deps):
    response = client.post("/experiments", json={
        "model": "simple_cnn",
        "dataset": "mnist",
        "training": {"epochs": 1, "batch_size": 32, "learning_rate": 0.001},
    })
    data = response.json()

    assert "model_id" in data
    assert "status" in data
    assert "train_loss_per_epoch" in data
    assert "test_loss_per_epoch" in data
    assert "test_accuracy" in data
    assert "confusion_matrix" in data
    assert "training_time_seconds" in data
    assert "sample_gradcams" in data


def test_experiment_model_id_is_returned(mock_deps):
    response = client.post("/experiments", json={
        "model": "lenet5",
        "dataset": "fashion_mnist",
        "training": {"epochs": 1, "batch_size": 32, "learning_rate": 0.001},
    })
    data = response.json()
    assert data["model_id"] == mock_deps["model_id"]


def test_compare_response_contains_6_results(mock_deps):
    response = client.post("/compare", json={
        "dataset": "mnist",
        "training": {"epochs": 1, "batch_size": 32, "learning_rate": 0.001},
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 6


def test_compare_result_model_names(mock_deps):
    response = client.post("/compare", json={
        "dataset": "cifar10",
        "training": {"epochs": 1, "batch_size": 32, "learning_rate": 0.001},
    })
    returned_models = [r["model"] for r in response.json()["results"]]
    assert returned_models == MODEL_NAMES


def test_invalid_model_name_rejected():
    response = client.post("/experiments", json={
        "model": "transformer",
        "dataset": "mnist",
        "training": {},
    })
    assert response.status_code == 422


def test_invalid_dataset_rejected():
    response = client.post("/experiments", json={
        "model": "simple_cnn",
        "dataset": "imagenet",
        "training": {},
    })
    assert response.status_code == 422


def test_predict_missing_weights_returns_404():
    import io
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    response = client.post("/predict", data={
        "model_name": "simple_cnn",
        "dataset": "mnist",
        "model_id": "550e8400-e29b-41d4-a716-446655440000",
    }, files={"file": ("test.png", fake_image, "image/png")})
    assert response.status_code == 404


def test_predict_invalid_model_id_returns_400():
    import io
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    response = client.post("/predict", data={
        "model_name": "simple_cnn",
        "dataset": "mnist",
        "model_id": "not-a-valid-uuid",
    }, files={"file": ("test.png", fake_image, "image/png")})
    assert response.status_code == 400
