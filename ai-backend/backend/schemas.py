from pydantic import BaseModel
from typing import Literal, List


class TrainingConfig(BaseModel):
    epochs: int = 5
    batch_size: int = 32
    learning_rate: float = 0.001


class ExperimentConfig(BaseModel):
    # Keep this in sync with models.factory.MODEL_NAMES — checked by test_schemas.py.
    model: Literal["simple_cnn", "lenet5", "alexnet", "vgg11", "resnet18", "mobilenet"]
    dataset: Literal["mnist", "cifar10", "fashion_mnist"]
    training: TrainingConfig


class CompareConfig(BaseModel):
    dataset: Literal["mnist", "cifar10", "fashion_mnist"]
    training: TrainingConfig


class ClassConfidence(BaseModel):
    label: str
    confidence: float


class PredictResponse(BaseModel):
    predicted_class: str
    predicted_index: int
    confidences: List[ClassConfidence]


class GradCamResponse(BaseModel):
    predicted_class: str
    predicted_index: int
    confidences: List[ClassConfidence]
    gradcam_image: str
