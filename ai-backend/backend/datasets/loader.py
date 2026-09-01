from dataclasses import dataclass
from typing import Dict, List, Tuple

import torch
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import datasets, transforms

VAL_FRACTION = 0.1
SPLIT_SEED = 42


@dataclass(frozen=True)
class DatasetSpec:
    in_channels: int
    input_size: Tuple[int, int]
    num_classes: int
    class_labels: List[str]


DATASET_SPECS: Dict[str, DatasetSpec] = {
    "mnist": DatasetSpec(
        in_channels=1, input_size=(32, 32), num_classes=10,
        class_labels=[str(i) for i in range(10)],
    ),
    "fashion_mnist": DatasetSpec(
        in_channels=1, input_size=(32, 32), num_classes=10,
        class_labels=[
            "T-shirt", "Trouser", "Pullover", "Dress", "Coat",
            "Sandal", "Shirt", "Sneaker", "Bag", "Ankle boot",
        ],
    ),
    "cifar10": DatasetSpec(
        in_channels=3, input_size=(32, 32), num_classes=10,
        class_labels=[
            "airplane", "automobile", "bird", "cat", "deer",
            "dog", "frog", "horse", "ship", "truck",
        ],
    ),
}


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
    if name not in DATASET_SPECS:
        raise ValueError(f"Unknown dataset: {name}")

    spec = DATASET_SPECS[name]
    transform = transforms.Compose([
        transforms.Resize(spec.input_size),
        transforms.ToTensor(),
    ])

    if name == "mnist":
        dataset_cls = datasets.MNIST
    elif name == "fashion_mnist":
        dataset_cls = datasets.FashionMNIST
    else:
        dataset_cls = datasets.CIFAR10

    train = dataset_cls(root="./data", train=True, download=True, transform=transform)
    test = dataset_cls(root="./data", train=False, download=True, transform=transform)
    train_loader, val_loader = _split_train_val(train, batch_size)
    return (
        train_loader, val_loader, DataLoader(test, batch_size=batch_size),
        spec.num_classes, spec.in_channels, spec.input_size,
    )
