from typing import Tuple

from torch import nn

from .simple_cnn import SimpleCNN
from .lenet5 import LeNet5
from .alexnet import AlexNet
from .vgg11 import VGG11
from .resnet18_custom import ResNet18
from .mobilenet import MobileNetV1

# Single source of truth for valid model names on the Python side. schemas.py's
# ExperimentConfig.model still hard-codes this list as Literal["simple_cnn", ...] instead of
# reusing MODEL_NAMES directly (Literal[tuple(MODEL_NAMES)] does work for this - see main.py's
# ModelName/DatasetName), so it's kept in sync manually and checked against MODEL_NAMES by
# tests/test_schemas.py.
MODEL_FACTORIES = {
    "simple_cnn": lambda in_channels, num_classes, input_size: SimpleCNN(in_channels, num_classes, input_size),
    "lenet5": lambda in_channels, num_classes, input_size: LeNet5(in_channels, num_classes, input_size),
    "alexnet": lambda in_channels, num_classes, input_size: AlexNet(in_channels, num_classes, input_size),
    "vgg11": lambda in_channels, num_classes, input_size: VGG11(in_channels, num_classes),
    "resnet18": lambda in_channels, num_classes, input_size: ResNet18(in_channels, num_classes),
    "mobilenet": lambda in_channels, num_classes, input_size: MobileNetV1(in_channels, num_classes, input_size),
}

MODEL_NAMES = list(MODEL_FACTORIES.keys())


def create_model(name: str, num_classes: int, in_channels: int, input_size: Tuple[int, int]) -> nn.Module:
    try:
        factory = MODEL_FACTORIES[name]
    except KeyError:
        raise ValueError(f"Unknown model: {name}")
    return factory(in_channels, num_classes, input_size)
