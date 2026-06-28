import torch.nn as nn


def _dw_sep(in_ch, out_ch, stride=1):
    return nn.Sequential(
        nn.Conv2d(in_ch, in_ch, kernel_size=3, stride=stride, padding=1, groups=in_ch, bias=False),
        nn.BatchNorm2d(in_ch),
        nn.ReLU(inplace=True),
        nn.Conv2d(in_ch, out_ch, kernel_size=1, bias=False),
        nn.BatchNorm2d(out_ch),
        nn.ReLU(inplace=True),
    )


class MobileNetV1(nn.Module):
    def __init__(self, in_channels, num_classes, input_size=(32, 32)):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
        )
        self.dw1 = _dw_sep(32, 64)
        self.dw2 = _dw_sep(64, 128, stride=2)
        self.dw3 = _dw_sep(128, 128)
        self.dw4 = _dw_sep(128, 256, stride=2)
        self.dw5 = _dw_sep(256, 256)
        self.dw6 = _dw_sep(256, 512, stride=2)
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Linear(512, num_classes)

    def forward(self, x):
        x = self.stem(x)
        x = self.dw1(x)
        x = self.dw2(x)
        x = self.dw3(x)
        x = self.dw4(x)
        x = self.dw5(x)
        x = self.dw6(x)
        x = self.pool(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)
