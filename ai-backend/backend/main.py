import base64
import io
import os
import uuid

import matplotlib
import numpy as np
import torch
import torch.optim as optim
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image
from torchvision import transforms

matplotlib.use("Agg")
import matplotlib.cm as cm

from backend.datasets.loader import load_dataset
from backend.models.factory import MODEL_NAMES, create_model
from backend.schemas import (
    ClassConfidence, CompareConfig, ExperimentConfig, GradCamResponse, PredictResponse,
)
from backend.training.trainer import evaluate, train

app = FastAPI()

SAVED_MODELS_DIR = "saved_models"
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

MNIST_CLASSES = [str(i) for i in range(10)]
CIFAR10_CLASSES = [
    "airplane", "automobile", "bird", "cat", "deer",
    "dog", "frog", "horse", "ship", "truck",
]
FASHION_MNIST_CLASSES = [
    "T-shirt", "Trouser", "Pullover", "Dress", "Coat",
    "Sandal", "Shirt", "Sneaker", "Bag", "Ankle boot",
]


def _resolve_dataset(dataset: str):
    if dataset == "mnist":
        transform = transforms.Compose([
            transforms.Grayscale(1),
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        return 1, (32, 32), 10, MNIST_CLASSES, transform
    elif dataset == "fashion_mnist":
        transform = transforms.Compose([
            transforms.Grayscale(1),
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        return 1, (32, 32), 10, FASHION_MNIST_CLASSES, transform
    elif dataset == "cifar10":
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
        ])
        return 3, (32, 32), 10, CIFAR10_CLASSES, transform
    else:
        raise HTTPException(status_code=400, detail=f"Unknown dataset: {dataset}")


def _load_inference_model(model_name: str, dataset: str, model_id: str, device: str):
    if model_name not in MODEL_NAMES:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")

    try:
        uuid.UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid model_id")

    weights_path = os.path.join(SAVED_MODELS_DIR, f"{model_id}.pth")
    if not os.path.exists(weights_path):
        raise HTTPException(status_code=404, detail="Model weights not found")

    in_channels, input_size, num_classes, class_labels, transform = _resolve_dataset(dataset)

    model = create_model(model_name, num_classes, in_channels, input_size)
    try:
        model.load_state_dict(torch.load(weights_path, map_location=device))
    except RuntimeError:
        raise HTTPException(status_code=400, detail="model_name does not match the saved weights")
    model.to(device)
    model.eval()

    return model, in_channels, input_size, num_classes, class_labels, transform


def _read_uploaded_image(file: UploadFile) -> Image.Image:
    try:
        return Image.open(io.BytesIO(file.file.read()))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or unsupported image file")


def _get_target_layer(model, model_name: str):
    if model_name == "simple_cnn":
        return model.conv2
    elif model_name == "lenet5":
        return model.conv2
    elif model_name == "vgg11":
        return model.features[18]
    elif model_name == "resnet18":
        return model.model.layer4[-1]
    elif model_name == "alexnet":
        return model.features[10]
    elif model_name == "mobilenet":
        return model.dw6
    raise ValueError(f"Unknown model: {model_name}")


def _compute_grad_cam(model, tensor, target_layer, predicted_index, device):
    activations, gradients = [], []

    fh = target_layer.register_forward_hook(lambda m, i, o: activations.append(o))
    bh = target_layer.register_full_backward_hook(lambda m, gi, go: gradients.append(go[0]))

    try:
        output = model(tensor.to(device))
        model.zero_grad()
        output[0, predicted_index].backward()
    finally:
        fh.remove()
        bh.remove()

    act = activations[0].detach().cpu().numpy()[0]
    grad = gradients[0].detach().cpu().numpy()[0]

    weights = grad.mean(axis=(1, 2))
    cam = np.zeros(act.shape[1:], dtype=np.float32)
    for w, a in zip(weights, act):
        cam += w * a

    cam = np.maximum(cam, 0)
    if cam.max() > 0:
        cam /= cam.max()

    return cam


def _overlay_grad_cam(cam, original_tensor):
    img = original_tensor.squeeze().cpu().numpy()

    if img.ndim == 2:
        img = np.stack([img] * 3, axis=-1)
    else:
        img = img.transpose(1, 2, 0)

    img = (img - img.min()) / (img.max() - img.min() + 1e-8)

    cam_resized = np.array(
        Image.fromarray((cam * 255).astype(np.uint8)).resize(
            (img.shape[1], img.shape[0]), Image.BILINEAR
        )
    ) / 255.0

    heatmap = cm.jet(cam_resized)[:, :, :3]
    blended = (0.5 * img + 0.5 * heatmap).clip(0, 1)

    buf = io.BytesIO()
    Image.fromarray((blended * 255).astype(np.uint8)).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _generate_sample_gradcams(model, model_name, test_loader, class_labels, device):
    model.eval()
    target_layer = _get_target_layer(model, model_name)
    seen = {}
    samples = []

    for images, labels in test_loader:
        for img, label in zip(images, labels):
            cls = label.item()
            if cls in seen:
                continue
            try:
                tensor = img.unsqueeze(0)
                with torch.no_grad():
                    out = model(tensor.to(device))
                pred_idx = out.argmax(dim=1).item()
                confidence = torch.softmax(out, dim=1)[0, pred_idx].item()

                cam = _compute_grad_cam(model, tensor, target_layer, pred_idx, device)
                gradcam_image = _overlay_grad_cam(cam, tensor)

                samples.append({
                    "true_label": class_labels[cls],
                    "predicted_label": class_labels[pred_idx],
                    "confidence": confidence,
                    "gradcam_image": gradcam_image,
                })
                seen[cls] = True
            except Exception:
                pass

        if len(seen) == len(class_labels):
            break

    return samples


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/experiments")
def run_experiment(config: ExperimentConfig):

    device = "cuda" if torch.cuda.is_available() else "cpu"
    train_loader, test_loader, num_classes, in_channels, input_size = load_dataset(
        config.dataset, config.training.batch_size
    )

    model = create_model(config.model, num_classes, in_channels, input_size)
    optimizer = optim.Adam(model.parameters(), lr=config.training.learning_rate)

    train_loss, test_loss_per_epoch, training_time = train(
        model, train_loader, test_loader, config.training.epochs, optimizer, device=device
    )
    metrics = evaluate(model, test_loader, device=device)

    model_id = str(uuid.uuid4())
    torch.save(model.state_dict(), os.path.join(SAVED_MODELS_DIR, f"{model_id}.pth"))

    _, _, _, class_labels, _ = _resolve_dataset(config.dataset)
    sample_gradcams = _generate_sample_gradcams(model, config.model, test_loader, class_labels, device)

    return {
        "status": "training and evaluation finished",
        "model_id": model_id,
        "train_loss_per_epoch": train_loss,
        "test_loss_per_epoch": test_loss_per_epoch,
        "test_loss": metrics["loss"],
        "test_accuracy": metrics["accuracy"],
        "training_time_seconds": training_time,
        "confusion_matrix": metrics["confusion_matrix"],
        "sample_gradcams": sample_gradcams,
    }


@app.post("/compare")
def compare_models(config: CompareConfig):

    device = "cuda" if torch.cuda.is_available() else "cpu"
    train_loader, test_loader, num_classes, in_channels, input_size = load_dataset(
        config.dataset, config.training.batch_size
    )

    results = []
    for model_name in MODEL_NAMES:
        model = create_model(model_name, num_classes, in_channels, input_size)
        optimizer = optim.Adam(model.parameters(), lr=config.training.learning_rate)

        train_loss, test_loss_per_epoch, training_time = train(
            model, train_loader, test_loader, config.training.epochs, optimizer, device=device
        )
        metrics = evaluate(model, test_loader, device=device)

        results.append({
            "model": model_name,
            "train_loss_per_epoch": train_loss,
            "test_loss_per_epoch": test_loss_per_epoch,
            "test_loss": metrics["loss"],
            "test_accuracy": metrics["accuracy"],
            "training_time_seconds": training_time,
            "confusion_matrix": metrics["confusion_matrix"],
        })

    return {
        "dataset": config.dataset,
        "epochs": config.training.epochs,
        "results": results,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(
    model_name: str = Form(...),
    dataset: str = Form(...),
    model_id: str = Form(...),
    file: UploadFile = File(...),
):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, _, _, num_classes, class_labels, transform = _load_inference_model(
        model_name, dataset, model_id, device
    )

    image = _read_uploaded_image(file)
    tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(tensor)
        probs = torch.softmax(output, dim=1)[0]

    pred_idx = probs.argmax().item()
    confidences = [
        ClassConfidence(label=class_labels[i], confidence=probs[i].item())
        for i in range(num_classes)
    ]

    return PredictResponse(
        predicted_class=class_labels[pred_idx],
        predicted_index=pred_idx,
        confidences=confidences,
    )


@app.post("/gradcam", response_model=GradCamResponse)
async def gradcam(
    model_name: str = Form(...),
    dataset: str = Form(...),
    model_id: str = Form(...),
    file: UploadFile = File(...),
):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, _, _, num_classes, class_labels, transform = _load_inference_model(
        model_name, dataset, model_id, device
    )

    image = _read_uploaded_image(file)
    tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(tensor.to(device))
        probs = torch.softmax(output, dim=1)[0]

    pred_idx = probs.argmax().item()
    target_layer = _get_target_layer(model, model_name)
    cam = _compute_grad_cam(model, tensor, target_layer, pred_idx, device)
    gradcam_image = _overlay_grad_cam(cam, tensor)

    confidences = [
        ClassConfidence(label=class_labels[i], confidence=probs[i].item())
        for i in range(num_classes)
    ]

    return GradCamResponse(
        predicted_class=class_labels[pred_idx],
        predicted_index=pred_idx,
        confidences=confidences,
        gradcam_image=gradcam_image,
    )
