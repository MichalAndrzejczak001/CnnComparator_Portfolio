from torchvision import datasets, transforms
from torch.utils.data import DataLoader


def load_dataset(name: str, batch_size: int = 32):
    if name == "mnist":
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        train = datasets.MNIST(root="./data", train=True, download=True, transform=transform)
        test = datasets.MNIST(root="./data", train=False, download=True, transform=transform)
        return (
            DataLoader(train, batch_size=batch_size, shuffle=True),
            DataLoader(test, batch_size=batch_size),
            10, 1, (32, 32),
        )

    elif name == "fashion_mnist":
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        train = datasets.FashionMNIST(root="./data", train=True, download=True, transform=transform)
        test = datasets.FashionMNIST(root="./data", train=False, download=True, transform=transform)
        return (
            DataLoader(train, batch_size=batch_size, shuffle=True),
            DataLoader(test, batch_size=batch_size),
            10, 1, (32, 32),
        )

    elif name == "cifar10":
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        train = datasets.CIFAR10(root="./data", train=True, download=True, transform=transform)
        test = datasets.CIFAR10(root="./data", train=False, download=True, transform=transform)
        return (
            DataLoader(train, batch_size=batch_size, shuffle=True),
            DataLoader(test, batch_size=batch_size),
            10, 3, (32, 32),
        )

    else:
        raise ValueError(f"Unknown dataset: {name}")
