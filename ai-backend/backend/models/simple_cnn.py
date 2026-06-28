import torch
import torch.nn as nn
import torch.nn.functional as F


class SimpleCNN(nn.Module):
    def __init__(self, in_channels, num_classes, input_size=(32, 32)):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, 32, kernel_size=3, stride=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, stride=1)
        self.pool = nn.MaxPool2d(2)

        flatten_size = self._get_flatten_size(in_channels, input_size)
        self.fc1 = nn.Linear(flatten_size, 128)
        self.fc2 = nn.Linear(128, num_classes)

    def _get_flatten_size(self, in_channels, input_size):
        with torch.no_grad():
            x = torch.zeros(1, in_channels, *input_size)
            x = self.pool(F.relu(self.conv1(x)))
            x = self.pool(F.relu(self.conv2(x)))
            return x.view(1, -1).size(1)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        return self.fc2(x)
