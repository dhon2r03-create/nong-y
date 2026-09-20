"""
Dinh nghia kien truc mo hinh CNN dung de phan loai benh cay trong.

Su dung MobileNetV2 (transfer learning) vi mo hinh nay nho, nhanh,
phu hop chay tren CPU / server yeu, van cho do chinh xac tot voi
bai toan phan loai anh la cay.
"""
from __future__ import annotations

import torch
import torch.nn as nn
from torchvision import models


def build_model(num_classes: int, pretrained: bool = True) -> nn.Module:
    """Tao mo hinh MobileNetV2 voi lop phan loai cuoi duoc thay the
    cho phu hop voi so luong nhan (so loai benh) cua dataset.
    """
    weights = models.MobileNet_V2_Weights.DEFAULT if pretrained else None
    model = models.mobilenet_v2(weights=weights)

    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def get_inference_transform():
    """Transform anh dau vao khi du doan (phai giong luc train, tru augmentation)."""
    from torchvision import transforms

    return transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )


def load_trained_model(weights_path: str, num_classes: int, device: str = "cpu") -> nn.Module:
    model = build_model(num_classes=num_classes, pretrained=False)
    state_dict = torch.load(weights_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    for param in model.parameters():
        param.requires_grad = True
    model.eval()
    return model


class GradCAM:
    """Tinh toan Gradient-weighted Class Activation Mapping (Grad-CAM)
    cho MobileNetV2 nham truc quan hoa vung mo hinh tap trung nhan dien benh.
    """

    def __init__(self, model: nn.Module, target_layer: nn.Module | None = None):
        self.model = model
        self.target_layer = target_layer if target_layer is not None else model.features[-1]
        self.gradients = None
        self.activations = None
        self.handles = []
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, inp, out):
            self.activations = out.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        h1 = self.target_layer.register_forward_hook(forward_hook)
        h2 = self.target_layer.register_full_backward_hook(backward_hook)
        self.handles = [h1, h2]

    def generate(self, input_tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        import torch.nn.functional as F

        self.model.zero_grad()
        output = self.model(input_tensor)

        score = output[0, class_idx]
        score.backward(retain_graph=True)

        gradients = self.gradients[0]  # [C, H, W]
        activations = self.activations[0]  # [C, H, W]

        weights = gradients.mean(dim=(1, 2), keepdim=True)  # [C, 1, 1]
        cam = (weights * activations).sum(dim=0)  # [H, W]
        cam = F.relu(cam)

        cam_min, cam_max = cam.min(), cam.max()
        if cam_max > cam_min:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = torch.zeros_like(cam)

        return cam.cpu().numpy()

    def release(self):
        for h in self.handles:
            h.remove()
        self.handles.clear()


def apply_colormap_jet(heatmap: np.ndarray) -> np.ndarray:
    """Chuyen doi ban do nhiet don kenh [0, 1] thanh anh mau RGB (Jet colormap) bang pure numpy."""
    import numpy as np

    h = np.clip(heatmap, 0.0, 1.0)
    r = np.clip(1.5 - np.abs(4.0 * h - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * h - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * h - 1.0), 0.0, 1.0)
    rgb = np.stack([r, g, b], axis=-1)
    return (rgb * 255.0).astype(np.uint8)


def generate_gradcam_overlay(
    model: nn.Module,
    image,
    class_idx: int,
    device: str = "cpu",
    alpha: float = 0.45,
):
    """Tao anh nhiet Grad-CAM de de len anh goc va tra ve doi tuong PIL Image."""
    from PIL import Image

    transform = get_inference_transform()
    input_tensor = transform(image).unsqueeze(0).to(device)

    cam_engine = GradCAM(model)
    try:
        heatmap = cam_engine.generate(input_tensor, class_idx=class_idx)
    finally:
        cam_engine.release()

    # Chuyen doi heatmap sang RGB va resize theo kich thuoc anh goc
    rgb_heatmap_arr = apply_colormap_jet(heatmap)
    heatmap_img = Image.fromarray(rgb_heatmap_arr, mode="RGB").resize(
        image.size, resample=Image.Resampling.BILINEAR
    )

    # Tron heatmap voi anh goc
    overlay = Image.blend(image.convert("RGB"), heatmap_img, alpha=alpha)
    return overlay

