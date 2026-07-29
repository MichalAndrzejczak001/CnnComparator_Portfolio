import torch
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

from backend.models.resnet18_custom import ResNet18
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

    result = evaluate(model, loader, num_classes=10)

    assert "loss" in result
    assert "accuracy" in result
    assert "confusion_matrix" in result


def test_evaluate_accuracy_in_range():
    model = SimpleCNN(1, 10)
    loader = make_loader()

    result = evaluate(model, loader, num_classes=10)

    assert 0.0 <= result["accuracy"] <= 1.0


def test_evaluate_confusion_matrix_shape():
    num_classes = 10
    model = SimpleCNN(1, num_classes)
    loader = make_loader(num_classes=num_classes)

    result = evaluate(model, loader, num_classes=num_classes)
    matrix = result["confusion_matrix"]

    assert len(matrix) == num_classes
    assert all(len(row) == num_classes for row in matrix)


def test_evaluate_confusion_matrix_shape_is_stable_when_a_class_is_never_sampled():
    num_classes = 10
    model = SimpleCNN(1, num_classes)
    x = torch.randn(4, 1, 32, 32)
    y = torch.tensor([0, 1, 2, 3])
    loader = DataLoader(TensorDataset(x, y), batch_size=4)

    result = evaluate(model, loader, num_classes=num_classes)
    matrix = result["confusion_matrix"]

    assert len(matrix) == num_classes
    assert all(len(row) == num_classes for row in matrix)


def test_train_with_batchnorm_model_does_not_crash_on_an_uneven_dataset_size():
    # Regression test: ResNet18's BatchNorm layers raise "Expected more than 1
    # value per channel when training" if the last batch of an epoch has size 1
    # (its deepest feature map is already 1x1 spatially, so batch=1 there means
    # exactly one value per channel). load_dataset() sets drop_last=True on the
    # train loader specifically to prevent this; this test locks that safety net
    # in by using a dataset size that would otherwise produce a final batch of 1.
    model = ResNet18(1, 10)
    optimizer = optim.Adam(model.parameters())
    x = torch.randn(11, 1, 32, 32)
    y = torch.randint(0, 10, (11,))
    loader = DataLoader(TensorDataset(x, y), batch_size=2, drop_last=True)

    train_losses, test_losses, _ = train(model, loader, loader, epochs=1, optimizer=optimizer)

    assert len(train_losses) == 1
    assert len(test_losses) == 1
