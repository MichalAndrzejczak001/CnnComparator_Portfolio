from typing import Tuple

import torch
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import datasets, transforms

VAL_FRACTION = 0.1
SPLIT_SEED = 42


def _split_train_val(train_dataset: Dataset, batch_size: int) -> Tuple[DataLoader, DataLoader]:
    val_size = int(len(train_dataset) * VAL_FRACTION)
    train_size = len(train_dataset) - val_size
    generator = torch.Generator().manual_seed(SPLIT_SEED)
    train_subset, val_subset = random_split(train_dataset, [train_size, val_size], generator=generator)

    train_loader = DataLoader(train_subset, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_subset, batch_size=batch_size)
    return train_loader, val_loader


def load_dataset(
        name: str, batch_size: int = 32
) -> Tuple[DataLoader, DataLoader, DataLoader, int, int, Tuple[int, int]]:
    if name == "mnist":
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        train = datasets.MNIST(root="./data", train=True, download=True, transform=transform)
        test = datasets.MNIST(root="./data", train=False, download=True, transform=transform)
        train_loader, val_loader = _split_train_val(train, batch_size)
        return (
            train_loader, val_loader, DataLoader(test, batch_size=batch_size),
            10, 1, (32, 32),
        )

    elif name == "fashion_mnist":
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        train = datasets.FashionMNIST(root="./data", train=True, download=True, transform=transform)
        test = datasets.FashionMNIST(root="./data", train=False, download=True, transform=transform)
        train_loader, val_loader = _split_train_val(train, batch_size)
        return (
            train_loader, val_loader, DataLoader(test, batch_size=batch_size),
            10, 1, (32, 32),
        )

    elif name == "cifar10":
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        train = datasets.CIFAR10(root="./data", train=True, download=True, transform=transform)
        test = datasets.CIFAR10(root="./data", train=False, download=True, transform=transform)
        train_loader, val_loader = _split_train_val(train, batch_size)
        return (
            train_loader, val_loader, DataLoader(test, batch_size=batch_size),
            10, 3, (32, 32),
        )

    else:
        raise ValueError(f"Unknown dataset: {name}")
