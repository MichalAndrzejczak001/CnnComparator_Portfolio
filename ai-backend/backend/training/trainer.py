import time
import torch
import torch.nn as nn


def count_parameters(model):
    return sum(p.numel() for p in model.parameters())


def benchmark_inference(model, device, in_channels, input_size, num_runs=20):
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


def compute_training_throughput(train_loader, epochs, training_time_seconds):
    if training_time_seconds <= 0:
        return 0.0
    images_per_epoch = len(train_loader) * train_loader.batch_size
    return (images_per_epoch * epochs) / training_time_seconds


def train(model, train_loader, val_loader, epochs, optimizer, device="cpu"):
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


def compute_calibration_curve(confidences, labels, preds, num_bins=10):
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


def evaluate(model, test_loader, num_classes, device="cpu"):
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

    accuracy = sum(l == p for l, p in zip(all_labels, all_preds)) / len(all_labels)
    calibration_curve = compute_calibration_curve(all_confidences, all_labels, all_preds)

    return {
        "loss": total_loss / len(test_loader),
        "accuracy": accuracy,
        "confusion_matrix": confusion_matrix,
        "calibration_curve": calibration_curve,
    }
