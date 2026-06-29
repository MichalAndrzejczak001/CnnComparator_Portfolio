import torch
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

from backend.models.simple_cnn import SimpleCNN
from backend.training.trainer import evaluate, train


def make_loader(n=20, in_channels=1, num_classes=10, batch_size=4):
    x = torch.randn(n, in_channels, 32, 32)
    y = torch.randint(0, num_classes, (n,))
    return DataLoader(TensorDataset(x, y), batch_size=batch_size)


def test_train_returns_correct_lengths():
    model = SimpleCNN(1, 10)
    optimizer = optim.Adam(model.parameters())
    loader = make_loader()

    train_losses, test_losses, elapsed = train(model, loader, loader, epochs=3, optimizer=optimizer)

    assert len(train_losses) == 3
    assert len(test_losses) == 3
    assert elapsed > 0


def test_train_loss_values_are_positive():
    model = SimpleCNN(1, 10)
    optimizer = optim.Adam(model.parameters())
    loader = make_loader()

    train_losses, test_losses, _ = train(model, loader, loader, epochs=2, optimizer=optimizer)

    assert all(l > 0 for l in train_losses)
    assert all(l > 0 for l in test_losses)


def test_evaluate_returns_required_keys():
    model = SimpleCNN(1, 10)
    loader = make_loader()

    result = evaluate(model, loader)

    assert "loss" in result
    assert "accuracy" in result
    assert "confusion_matrix" in result


def test_evaluate_accuracy_in_range():
    model = SimpleCNN(1, 10)
    loader = make_loader()

    result = evaluate(model, loader)

    assert 0.0 <= result["accuracy"] <= 1.0


def test_evaluate_confusion_matrix_shape():
    num_classes = 10
    model = SimpleCNN(1, num_classes)
    loader = make_loader(num_classes=num_classes)

    result = evaluate(model, loader)
    matrix = result["confusion_matrix"]

    assert len(matrix) == num_classes
    assert all(len(row) == num_classes for row in matrix)
