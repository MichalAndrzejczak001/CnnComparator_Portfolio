from typing import Tuple

from torch import nn

from .simple_cnn import SimpleCNN
from .lenet5 import LeNet5
from .alexnet import AlexNet
from .vgg11 import VGG11
from .resnet18_custom import ResNet18
from .mobilenet import MobileNetV1

# Single source of truth for valid model names on the Python side. schemas.py builds its
# ExperimentConfig.model Literal from this list directly (Literal[tuple(MODEL_NAMES)]), so
# there's nothing to keep in sync manually here anymore; test_schemas.py still asserts the
# two agree, as a regression guard against that import getting swapped for a hard-coded list.
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
