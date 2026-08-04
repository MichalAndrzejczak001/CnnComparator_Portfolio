import pytest

from backend.datasets.loader import load_dataset


@pytest.mark.parametrize("dataset,expected_channels", [
    ("mnist", 1),
    ("fashion_mnist", 1),
    ("cifar10", 3),
])
def test_load_dataset_returns_three_disjoint_loaders(dataset, expected_channels):
    train_loader, val_loader, test_loader, num_classes, in_channels, input_size = load_dataset(
        dataset, batch_size=64
    )

    assert num_classes == 10
    assert in_channels == expected_channels
    assert input_size == (32, 32)

    train_indices = set(train_loader.dataset.indices)
    val_indices = set(val_loader.dataset.indices)

    assert train_indices.isdisjoint(val_indices)
    assert len(val_indices) > 0
    assert len(train_indices) > 0

    full_train_size = len(train_loader.dataset.dataset)
    assert len(train_indices) + len(val_indices) == full_train_size
    # test set is untouched by the train/val split and comes from the official held-out split
    assert len(test_loader.dataset) > 0


def test_train_val_split_is_deterministic_across_calls():
    _, val_loader_a, _, _, _, _ = load_dataset("mnist", batch_size=64)
    _, val_loader_b, _, _, _, _ = load_dataset("mnist", batch_size=64)

    assert val_loader_a.dataset.indices == val_loader_b.dataset.indices
