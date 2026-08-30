import time
from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
from torch.optim import Optimizer
from torch.utils.data import DataLoader


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters())


# Raw byte size of everything torch.save(model.state_dict(), ...) would write: trainable
# parameters AND buffers (e.g. BatchNorm running_mean/running_var/num_batches_tracked). Two
# models can have the same param_count but a different real size if one has more BatchNorm
# layers, hence computing this separately instead of deriving it from param_count.
def compute_model_size_bytes(model: nn.Module) -> int:
    return sum(t.numel() * t.element_size() for t in model.state_dict().values())


def benchmark_inference(
        model: nn.Module, device: str, in_channels: int, input_size: Tuple[int, int], num_runs: int = 20
) -> float:
    model.to(device)
    model.eval()
    height, width = input_size
    dummy_input = torch.randn(1, in_channels, height, width, device=device)

    def sync():
        if device == "cuda":
            torch.cuda.synchronize()

    with torch.no_grad():
        for _ in range(3):
            model(dummy_input)

        sync()
        start = time.time()
        for _ in range(num_runs):
            model(dummy_input)
        sync()
        elapsed = time.time() - start

    return (elapsed / num_runs) * 1000


def compute_training_throughput(train_loader: DataLoader, epochs: int, training_time_seconds: float) -> float:
    if training_time_seconds <= 0:
        return 0.0
    images_per_epoch = len(train_loader) * train_loader.batch_size
    return (images_per_epoch * epochs) / training_time_seconds


def train(
        model: nn.Module, train_loader: DataLoader, val_loader: DataLoader, epochs: int,
        optimizer: Optimizer, device: str = "cpu"
) -> Tuple[List[float], List[float], List[float], List[float], float]:
    model.to(device)
    criterion = nn.CrossEntropyLoss()

    train_losses = []
    val_losses = []
    train_accuracies = []
    val_accuracies = []

    start = time.time()

    for _ in range(epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
            correct += (outputs.argmax(dim=1) == labels).sum().item()
            total += labels.size(0)
        train_losses.append(running_loss / len(train_loader))
        train_accuracies.append(correct / total)

        model.eval()
        epoch_val_loss = 0.0
        correct = 0
        total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                epoch_val_loss += loss.item()
                correct += (outputs.argmax(dim=1) == labels).sum().item()
                total += labels.size(0)
        val_losses.append(epoch_val_loss / len(val_loader))
        val_accuracies.append(correct / total)

    training_time = time.time() - start
    return train_losses, val_losses, train_accuracies, val_accuracies, training_time


def compute_calibration_curve(
        confidences: List[float], labels: List[int], preds: List[int], num_bins: int = 10
) -> List[Dict[str, Optional[float]]]:
    bins = []
    for i in range(num_bins):
        bin_min = i / num_bins
        bin_max = (i + 1) / num_bins
        indices = [
            j for j, c in enumerate(confidences)
            if (bin_min <= c < bin_max) or (i == num_bins - 1 and c == bin_max)
        ]
        count = len(indices)
        if count == 0:
            bins.append({
                "bin_min": bin_min, "bin_max": bin_max,
                "avg_confidence": None, "accuracy": None, "count": 0,
            })
            continue

        avg_confidence = sum(confidences[j] for j in indices) / count
        correct = sum(1 for j in indices if labels[j] == preds[j])
        bins.append({
            "bin_min": bin_min, "bin_max": bin_max,
            "avg_confidence": avg_confidence, "accuracy": correct / count, "count": count,
        })
    return bins


def evaluate(model: nn.Module, test_loader: DataLoader, num_classes: int, device: str = "cpu") -> Dict[str, object]:
    model.to(device)
    model.eval()
    criterion = nn.CrossEntropyLoss()

    total_loss = 0.0
    all_labels = []
    all_preds = []
    all_confidences = []

    with torch.no_grad():
        for images, labels in test_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            total_loss += loss.item()
            probs = torch.softmax(outputs, dim=1)
            confidences, preds = probs.max(dim=1)
            all_labels.extend(labels.cpu().tolist())
            all_preds.extend(preds.cpu().tolist())
            all_confidences.extend(confidences.cpu().tolist())

    confusion_matrix = [[0] * num_classes for _ in range(num_classes)]
    for true, pred in zip(all_labels, all_preds):
        confusion_matrix[true][pred] += 1

    accuracy = sum(label == pred for label, pred in zip(all_labels, all_preds)) / len(all_labels)
    calibration_curve = compute_calibration_curve(all_confidences, all_labels, all_preds)

    return {
        "loss": total_loss / len(test_loader),
        "accuracy": accuracy,
        "confusion_matrix": confusion_matrix,
        "calibration_curve": calibration_curve,
    }
