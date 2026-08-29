from pydantic import BaseModel, Field
from typing import Literal, List


class TrainingConfig(BaseModel):
    # Bounds mirror logic-backend's TrainingConfig (dto/TrainingConfig.java) and the
    # frontend's input ranges — ai-backend is reachable directly (not just through
    # logic-backend), so it must not trust an unbounded batch_size/epochs from any caller.
    epochs: int = Field(default=5, gt=0, le=100)
    batch_size: int = Field(default=32, gt=0, le=512)
    learning_rate: float = Field(default=0.001, gt=0, le=1.0)


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
