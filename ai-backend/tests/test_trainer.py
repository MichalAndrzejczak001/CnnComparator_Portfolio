import torch
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

from backend.models.resnet18_custom import ResNet18
from backend.models.simple_cnn import SimpleCNN
from backend.training.trainer import (
    benchmark_inference, compute_calibration_curve, compute_training_throughput, count_parameters, evaluate, train,
)


def make_loader(n=20, in_channels=1, num_classes=10, batch_size=4):
    x = torch.randn(n, in_channels, 32, 32)
    y = torch.randint(0, num_classes, (n,))
    return DataLoader(TensorDataset(x, y), batch_size=batch_size)


def test_train_returns_correct_lengths():
    model = SimpleCNN(1, 10)
    optimizer = optim.Adam(model.parameters())
    loader = make_loader()

    train_losses, val_losses, train_accs, val_accs, elapsed = train(
        model, loader, loader, epochs=3, optimizer=optimizer
    )

    assert len(train_losses) == 3
    assert len(val_losses) == 3
    assert len(train_accs) == 3
    assert len(val_accs) == 3
    assert elapsed > 0


def test_train_loss_values_are_positive():
    model = SimpleCNN(1, 10)
    optimizer = optim.Adam(model.parameters())
    loader = make_loader()

    train_losses, val_losses, _, _, _ = train(model, loader, loader, epochs=2, optimizer=optimizer)

    assert all(l > 0 for l in train_losses)
    assert all(l > 0 for l in val_losses)


def test_train_accuracy_values_are_in_range():
    model = SimpleCNN(1, 10)
    optimizer = optim.Adam(model.parameters())
    loader = make_loader()

    _, _, train_accs, val_accs, _ = train(model, loader, loader, epochs=2, optimizer=optimizer)

    assert all(0.0 <= a <= 1.0 for a in train_accs)
    assert all(0.0 <= a <= 1.0 for a in val_accs)


def test_evaluate_returns_required_keys():
    model = SimpleCNN(1, 10)
    loader = make_loader()

    result = evaluate(model, loader, num_classes=10)

    assert "loss" in result
    assert "accuracy" in result
    assert "confusion_matrix" in result
    assert "calibration_curve" in result


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

    train_losses, val_losses, _, _, _ = train(model, loader, loader, epochs=1, optimizer=optimizer)

    assert len(train_losses) == 1
    assert len(val_losses) == 1


def test_count_parameters_matches_manual_sum():
    model = SimpleCNN(1, 10)
    expected = sum(p.numel() for p in model.parameters())

    assert count_parameters(model) == expected


def test_count_parameters_is_positive_for_a_real_model():
    model = ResNet18(1, 10)

    assert count_parameters(model) > 0


def test_benchmark_inference_returns_a_positive_latency():
    model = SimpleCNN(1, 10)

    latency_ms = benchmark_inference(model, "cpu", in_channels=1, input_size=(32, 32), num_runs=3)

    assert latency_ms > 0


def test_compute_training_throughput_matches_manual_calculation():
    loader = make_loader(n=20, batch_size=4)  # 5 batches of 4

    throughput = compute_training_throughput(loader, epochs=3, training_time_seconds=10.0)

    assert throughput == (5 * 4 * 3) / 10.0


def test_compute_training_throughput_is_zero_when_training_time_is_zero():
    loader = make_loader(n=20, batch_size=4)

    assert compute_training_throughput(loader, epochs=3, training_time_seconds=0.0) == 0.0


def test_compute_calibration_curve_returns_ten_bins_covering_0_to_1():
    bins = compute_calibration_curve(confidences=[0.05, 0.95], labels=[0, 1], preds=[0, 1], num_bins=10)

    assert len(bins) == 10
    assert bins[0]["bin_min"] == 0.0
    assert bins[-1]["bin_max"] == 1.0


def test_compute_calibration_curve_groups_confidences_into_the_right_bin():
    # both fall in the [0.9, 1.0) bin; one correct, one wrong -> 50% accuracy
    bins = compute_calibration_curve(confidences=[0.91, 0.99], labels=[0, 1], preds=[0, 0], num_bins=10)

    top_bin = bins[9]
    assert top_bin["count"] == 2
    assert top_bin["accuracy"] == 0.5
    assert top_bin["avg_confidence"] == (0.91 + 0.99) / 2


def test_compute_calibration_curve_empty_bin_has_null_accuracy_and_confidence():
    bins = compute_calibration_curve(confidences=[0.95], labels=[0], preds=[0], num_bins=10)

    empty_bin = bins[0]
    assert empty_bin["count"] == 0
    assert empty_bin["accuracy"] is None
    assert empty_bin["avg_confidence"] is None
