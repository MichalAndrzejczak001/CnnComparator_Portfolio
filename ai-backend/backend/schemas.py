from pydantic import BaseModel, Field
from typing import Literal, List

from backend.datasets.loader import DATASET_SPECS
from backend.models.factory import MODEL_NAMES

# Built from MODEL_NAMES/DATASET_SPECS rather than hard-coded, so a new model/dataset only
# needs to be added in one place. main.py reuses these same aliases for /predict and
# /gradcam's Form fields, so all four endpoints reject an unknown model/dataset the same way.
ModelName = Literal[tuple(MODEL_NAMES)]
DatasetName = Literal[tuple(DATASET_SPECS)]


class TrainingConfig(BaseModel):
    # Bounds mirror logic-backend's TrainingConfig (dto/TrainingConfig.java) and the frontend's
    # input ranges. ai-backend is reachable directly, not just through logic-backend, so it
    # can't trust an unbounded batch_size/epochs from whoever's calling it.
    epochs: int = Field(default=5, gt=0, le=100)
    batch_size: int = Field(default=32, gt=0, le=512)
    learning_rate: float = Field(default=0.001, gt=0, le=1.0)


class ExperimentConfig(BaseModel):
    model: ModelName
    dataset: DatasetName
    training: TrainingConfig


class CompareConfig(BaseModel):
    dataset: DatasetName
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
