import time
import torch
import torch.nn as nn


def train(model, train_loader, test_loader, epochs, optimizer, device="cpu"):
    model.to(device)
    criterion = nn.CrossEntropyLoss()

    train_losses = []
    test_losses = []

    start = time.time()

    for _ in range(epochs):
        model.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
        train_losses.append(running_loss / len(train_loader))

        model.eval()
        epoch_test_loss = 0.0
        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                epoch_test_loss += loss.item()
        test_losses.append(epoch_test_loss / len(test_loader))

    training_time = time.time() - start
    return train_losses, test_losses, training_time


def evaluate(model, test_loader, device="cpu"):
    model.to(device)
    model.eval()
    criterion = nn.CrossEntropyLoss()

    total_loss = 0.0
    all_labels = []
    all_preds = []

    with torch.no_grad():
        for images, labels in test_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            total_loss += loss.item()
            preds = outputs.argmax(dim=1)
            all_labels.extend(labels.cpu().tolist())
            all_preds.extend(preds.cpu().tolist())

    num_classes = max(max(all_labels), max(all_preds)) + 1
    confusion_matrix = [[0] * num_classes for _ in range(num_classes)]
    for true, pred in zip(all_labels, all_preds):
        confusion_matrix[true][pred] += 1

    accuracy = sum(l == p for l, p in zip(all_labels, all_preds)) / len(all_labels)

    return {
        "loss": total_loss / len(test_loader),
        "accuracy": accuracy,
        "confusion_matrix": confusion_matrix,
    }
