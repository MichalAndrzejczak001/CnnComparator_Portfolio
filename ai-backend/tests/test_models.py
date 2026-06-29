import torch

from backend.models.alexnet import AlexNet
from backend.models.lenet5 import LeNet5
from backend.models.mobilenet import MobileNetV1
from backend.models.resnet18_custom import ResNet18
from backend.models.simple_cnn import SimpleCNN
from backend.models.vgg11 import VGG11


class TestSimpleCNN:
    def test_output_shape_mnist(self):
        model = SimpleCNN(in_channels=1, num_classes=10)
        out = model(torch.zeros(2, 1, 32, 32))
        assert out.shape == (2, 10)

    def test_output_shape_cifar(self):
        model = SimpleCNN(in_channels=3, num_classes=10)
        out = model(torch.zeros(2, 3, 32, 32))
        assert out.shape == (2, 10)

    def test_custom_num_classes(self):
        model = SimpleCNN(in_channels=1, num_classes=5)
        assert model(torch.zeros(1, 1, 32, 32)).shape == (1, 5)


class TestLeNet5:
    def test_output_shape_mnist(self):
        model = LeNet5(in_channels=1, num_classes=10)
        out = model(torch.zeros(2, 1, 32, 32))
        assert out.shape == (2, 10)

    def test_output_shape_cifar(self):
        model = LeNet5(in_channels=3, num_classes=10)
        out = model(torch.zeros(2, 3, 32, 32))
        assert out.shape == (2, 10)

    def test_custom_num_classes(self):
        model = LeNet5(in_channels=1, num_classes=7)
        assert model(torch.zeros(1, 1, 32, 32)).shape == (1, 7)


class TestAlexNet:
    def test_output_shape_mnist(self):
        model = AlexNet(in_channels=1, num_classes=10)
        out = model(torch.zeros(2, 1, 32, 32))
        assert out.shape == (2, 10)

    def test_output_shape_cifar(self):
        model = AlexNet(in_channels=3, num_classes=10)
        out = model(torch.zeros(2, 3, 32, 32))
        assert out.shape == (2, 10)

    def test_custom_num_classes(self):
        model = AlexNet(in_channels=3, num_classes=4)
        assert model(torch.zeros(1, 3, 32, 32)).shape == (1, 4)


class TestVGG11:
    def test_output_shape_mnist(self):
        model = VGG11(in_channels=1, num_classes=10)
        out = model(torch.zeros(2, 1, 32, 32))
        assert out.shape == (2, 10)

    def test_output_shape_cifar(self):
        model = VGG11(in_channels=3, num_classes=10)
        out = model(torch.zeros(2, 3, 32, 32))
        assert out.shape == (2, 10)

    def test_custom_num_classes(self):
        model = VGG11(in_channels=1, num_classes=3)
        assert model(torch.zeros(1, 1, 32, 32)).shape == (1, 3)


class TestResNet18:
    def test_output_shape_mnist(self):
        model = ResNet18(in_channels=1, num_classes=10)
        out = model(torch.zeros(2, 1, 32, 32))
        assert out.shape == (2, 10)

    def test_output_shape_cifar(self):
        model = ResNet18(in_channels=3, num_classes=10)
        out = model(torch.zeros(2, 3, 32, 32))
        assert out.shape == (2, 10)

    def test_custom_num_classes(self):
        model = ResNet18(in_channels=3, num_classes=6)
        assert model(torch.zeros(1, 3, 32, 32)).shape == (1, 6)


class TestMobileNetV1:
    def test_output_shape_mnist(self):
        model = MobileNetV1(in_channels=1, num_classes=10)
        out = model(torch.zeros(2, 1, 32, 32))
        assert out.shape == (2, 10)

    def test_output_shape_cifar(self):
        model = MobileNetV1(in_channels=3, num_classes=10)
        out = model(torch.zeros(2, 3, 32, 32))
        assert out.shape == (2, 10)

    def test_custom_num_classes(self):
        model = MobileNetV1(in_channels=1, num_classes=8)
        assert model(torch.zeros(1, 1, 32, 32)).shape == (1, 8)
