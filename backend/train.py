"""
Script huan luyen mo hinh phan loai benh cay trong.

Cach dung:
    python train.py --data_dir ../data/train --epochs 10 --batch_size 32

Yeu cau ve dataset (dinh dang ImageFolder cua torchvision):
    data/train/
        Ca_chua___Dom_la/
            anh1.jpg
            anh2.jpg
            ...
        Ca_chua___Khoe_manh/
            anh1.jpg
            ...
        Ot___Chay_la/
            ...

Ten thu muc = ten nhan (nen dat theo dang "TenCay___TenBenh" de he thong
tu dong tach duoc ten cay va ten benh khi hien thi ket qua va dashboard.
Neu khong co dau "___" thi toan bo ten thu muc se duoc coi la ten benh).

Script se tu dong chia du lieu train/validation (mac dinh 85/15), huan
luyen, va luu lai:
    - models/plant_disease_model.pth   (trong so mo hinh tot nhat)
    - models/class_names.json          (danh sach nhan theo dung thu tu index)
    - models/training_log.json         (lich su accuracy/loss de tham khao)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Tu dong nap site-packages tu .venv neu chay bang python3 he thong
_BACKEND_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _BACKEND_DIR.parent
for _candidate in [
    _ROOT_DIR / ".venv" / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages",
    _ROOT_DIR / ".venv" / "lib" / "python3.9" / "site-packages",
]:
    if _candidate.exists() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms

from model import build_model

BACKEND_DIR = Path(__file__).resolve().parent
MODELS_DIR = BACKEND_DIR.parent / "models"


def get_train_transforms():
    return transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
            ),
        ]
    )


def get_val_transforms():
    return transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
            ),
        ]
    )


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Su dung thiet bi: {device}")

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        raise FileNotFoundError(
            f"Khong tim thay thu muc dataset: {data_dir}. "
            "Hay dat anh vao data/train/<TenCay___TenBenh>/anh.jpg"
        )

    full_dataset = datasets.ImageFolder(str(data_dir), transform=get_train_transforms())
    class_names = full_dataset.classes
    num_classes = len(class_names)
    print(f"[INFO] Tim thay {len(full_dataset)} anh, {num_classes} nhan: {class_names}")

    if num_classes < 2:
        raise ValueError(
            "Can it nhat 2 thu muc (nhan) trong data/train de huan luyen phan loai."
        )

    val_ratio = args.val_split
    val_size = max(1, int(len(full_dataset) * val_ratio))
    train_size = len(full_dataset) - val_size
    train_subset, val_subset = random_split(full_dataset, [train_size, val_size])

    # Dataset validation khong nen dung augmentation -> gan lai transform rieng
    val_dataset_plain = datasets.ImageFolder(str(data_dir), transform=get_val_transforms())
    val_subset.dataset = val_dataset_plain

    train_loader = DataLoader(
        train_subset, batch_size=args.batch_size, shuffle=True, num_workers=args.num_workers
    )
    val_loader = DataLoader(
        val_subset, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers
    )

    model = build_model(num_classes=num_classes, pretrained=True).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=max(1, args.epochs // 3), gamma=0.5)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    best_acc = 0.0
    history = []

    for epoch in range(args.epochs):
        start = time.time()

        # ---- train ----
        model.train()
        running_loss, running_correct, total = 0.0, 0, 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            running_correct += (outputs.argmax(1) == labels).sum().item()
            total += images.size(0)

        train_loss = running_loss / total
        train_acc = running_correct / total

        # ---- validate ----
        model.eval()
        val_loss, val_correct, val_total = 0.0, 0, 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                val_correct += (outputs.argmax(1) == labels).sum().item()
                val_total += images.size(0)

        val_loss = val_loss / max(1, val_total)
        val_acc = val_correct / max(1, val_total)
        scheduler.step()

        elapsed = time.time() - start
        print(
            f"[Epoch {epoch + 1}/{args.epochs}] "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} ({elapsed:.1f}s)"
        )
        history.append(
            {
                "epoch": epoch + 1,
                "train_loss": train_loss,
                "train_acc": train_acc,
                "val_loss": val_loss,
                "val_acc": val_acc,
            }
        )

        if val_acc >= best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), MODELS_DIR / "plant_disease_model.pth")
            print(f"  -> Da luu mo hinh tot nhat (val_acc={val_acc:.4f})")

    with open(MODELS_DIR / "class_names.json", "w", encoding="utf-8") as f:
        json.dump(class_names, f, ensure_ascii=False, indent=2)

    with open(MODELS_DIR / "training_log.json", "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

    print(f"[DONE] Huan luyen xong. Do chinh xac validation tot nhat: {best_acc:.4f}")
    print(f"[DONE] Mo hinh va nhan da luu trong: {MODELS_DIR}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Huan luyen mo hinh phan loai benh cay trong")
    parser.add_argument("--data_dir", type=str, default=str(BACKEND_DIR.parent / "data" / "train"))
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--val_split", type=float, default=0.15)
    parser.add_argument("--num_workers", type=int, default=2)
    args = parser.parse_args()
    train(args)
