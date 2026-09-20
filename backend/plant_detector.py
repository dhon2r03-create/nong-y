"""
Module nhan dien va chan loc anh khong phai cay trong.
Phat hien chinh xac con nguoi, khuon mat, xe co, dong vat,
thiet bi dien tu, do vat, quan ao, phong o,... va yeu cau nguoi dung chup lai la cay.
Ho tro ca la cay bi benh nang doi mau vang, nau hoai tu, hoac hoa qua cay trong.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

# Bien toan cuc luu mo hinh tong quat ImageNet (load lazy)
_GENERAL_MODEL = None
_GENERAL_TRANSFORM = None
_CATEGORIES = None


def _load_general_classifier():
    """Nap mo hinh nhan dien doi tuong tong quat MobileNetV2."""
    global _GENERAL_MODEL, _GENERAL_TRANSFORM, _CATEGORIES
    if _GENERAL_MODEL is not None:
        return _GENERAL_MODEL, _GENERAL_TRANSFORM, _CATEGORIES

    try:
        import torchvision.models as models
        from torchvision.models import MobileNet_V2_Weights

        weights = MobileNet_V2_Weights.DEFAULT
        _GENERAL_MODEL = models.mobilenet_v2(weights=weights).eval()
        _GENERAL_TRANSFORM = weights.transforms()
        _CATEGORIES = weights.meta["categories"]
    except Exception as err:
        print(f"[WARN] Khong the nap mo hinh ImageNet phu tro: {err}")
        _GENERAL_MODEL = None

    return _GENERAL_MODEL, _GENERAL_TRANSFORM, _CATEGORIES


VEHICLE_KEYWORDS = [
    "car", "cab", "taxi", "wagon", "truck", "bus", "vehicle", "motorcycle", "moped",
    "bicycle", "bike", "scooter", "train", "locomotive", "airliner", "airplane", "aircraft",
    "helicopter", "boat", "ship", "canoe", "kayak", "yacht", "convertible", "jeep",
    "minivan", "limousine", "trailer", "tractor", "forklift", "ambulance"
]

ELECTRONIC_KEYWORDS = [
    "phone", "cellular", "telephone", "laptop", "notebook", "computer", "keyboard",
    "mouse", "monitor", "screen", "television", "tv", "radio", "camera", "printer",
    "modem", "ipod", "player", "speaker", "microphone", "headphones", "webcam"
]

CLOTHING_KEYWORDS = [
    "jersey", "sweatshirt", "t-shirt", "shirt", "suit", "coat", "dress", "jean",
    "cardigan", "cloak", "poncho", "apron", "vest", "kimono", "jacket", "pajama",
    "sock", "glove", "scarf", "tie", "hat", "cap", "bonnet", "bikini", "skirt"
]

FURNITURE_KEYWORDS = [
    "table", "desk", "chair", "bench", "sofa", "couch", "bed", "wardrobe",
    "bookcase", "shelf", "curtain", "pillow", "quilt", "rug", "blanket",
    "door", "window", "wall", "tile", "floor", "radiator", "toilet"
]

EVERYDAY_KEYWORDS = [
    "book", "notebook", "envelope", "packet", "carton", "box", "bottle", "cup",
    "bowl", "plate", "spoon", "fork", "knife", "watch", "clock", "purse", "bag",
    "wallet", "umbrella", "lighter", "scissors", "comb", "soap", "paper_towel"
]

ANIMAL_KEYWORDS = [
    "dog", "cat", "bird", "hound", "terrier", "spaniel", "retriever", "shepherd",
    "collie", "wolf", "fox", "bear", "lion", "tiger", "leopard", "cheetah", "elephant",
    "horse", "zebra", "cow", "ox", "bull", "sheep", "goat", "pig", "monkey", "ape",
    "rabbit", "mouse", "rat", "squirrel", "deer", "snake", "frog", "lizard", "turtle",
    "fish", "shark", "duck", "goose", "swan", "owl"
]

BOTANICAL_KEYWORDS = [
    "hay", "ear", "acorn", "hip", "daisy", "rose", "sunflower", "plant", "tree",
    "flower", "leaf", "strawberry", "orange", "lemon", "lime", "banana", "apple",
    "fig", "pineapple", "jackfruit", "custard_apple", "pomegranate", "corn", "mushroom",
    "pot", "flowerpot", "vase", "greenhouse", "buckeye", "artichoke", "head_cabbage",
    "broccoli", "cauliflower", "zucchini", "spaghetti_squash", "acorn_squash", "butternut_squash",
    "cucumber", "bell_pepper"
]


def identify_non_plant_object(image: Image.Image) -> tuple[str, str, float]:
    """Nhan dien loai doi tuong trong anh neu khong phai cay bang ImageNet MobileNetV2."""
    model, transform, categories = _load_general_classifier()
    if model is None:
        return "UNKNOWN", "đối tượng không xác định", 0.0

    try:
        import torch

        tensor = transform(image.convert("RGB")).unsqueeze(0)
        with torch.no_grad():
            probs = model(tensor).softmax(1)[0]
            topk = torch.topk(probs, 8)

        total_clothing_score = 0.0
        total_furniture_score = 0.0
        total_vehicle_score = 0.0
        total_electronic_score = 0.0
        total_animal_score = 0.0
        total_everyday_score = 0.0
        total_botanical_score = 0.0

        for score_t, idx_t in zip(topk.values, topk.indices):
            idx = idx_t.item()
            score = float(score_t.item())
            label = categories[idx].lower().replace(" ", "_")

            if any(b in label for b in BOTANICAL_KEYWORDS):
                total_botanical_score += score
            elif any(c in label for c in CLOTHING_KEYWORDS):
                total_clothing_score += score
            elif any(f in label for f in FURNITURE_KEYWORDS):
                total_furniture_score += score
            elif any(v in label for v in VEHICLE_KEYWORDS):
                total_vehicle_score += score
            elif any(e in label for e in ELECTRONIC_KEYWORDS):
                total_electronic_score += score
            elif idx < 398 or any(a in label for a in ANIMAL_KEYWORDS):
                total_animal_score += score
            elif any(ed in label for ed in EVERYDAY_KEYWORDS):
                total_everyday_score += score

        if total_botanical_score >= 0.20:
            return "BOTANICAL", "thực vật / cây cối", total_botanical_score

        if total_clothing_score >= 0.18:
            return "TRANG_PHUC", "quần áo / trang phục", total_clothing_score

        if total_vehicle_score >= 0.15:
            return "XE_CO", "xe cộ / phương tiện giao thông", total_vehicle_score

        if total_electronic_score >= 0.15:
            return "DIEN_TU", "thiết bị điện tử / công nghệ", total_electronic_score

        if total_animal_score >= 0.22:
            return "DONG_VAT", "động vật / thú cưng", total_animal_score

        if total_furniture_score >= 0.20:
            return "NOI_THAT", "nội thất / phòng ở", total_furniture_score

        if total_everyday_score >= 0.25:
            return "DO_VAT", "đồ vật sinh hoạt", total_everyday_score

        top1_idx = topk.indices[0].item()
        top1_score = float(topk.values[0].item())
        top1_label = categories[top1_idx].lower().replace(" ", "_")

        if any(b in top1_label for b in BOTANICAL_KEYWORDS):
            return "BOTANICAL", "thực vật / cây cối", top1_score

        if top1_score >= 0.35:
            clean_name = top1_label.replace("_", " ")
            return "DO_VAT", f"đồ vật ({clean_name})", top1_score

    except Exception as e:
        print(f"[WARN] Loi ImageNet: {e}")

    return "UNKNOWN", "đối tượng không liên quan đến cây trồng", 0.0


def compute_texture_metrics(image: Image.Image) -> tuple[float, float]:
    """Tinh toan do lech chuan mau (std) va do phuc tap ket cau be mat (laplacian variance)."""
    img_rgb = image.convert("RGB")
    arr = np.array(img_rgb, dtype=np.float32)
    std = float(arr.std())

    # Kiem tra ket cau tren anh xam co nho
    gray = np.array(image.convert("L").resize((256, 256)), dtype=np.float32)
    lap = (
        -4 * gray[1:-1, 1:-1]
        + gray[:-2, 1:-1]
        + gray[2:, 1:-1]
        + gray[1:-1, :-2]
        + gray[1:-1, 2:]
    )
    laplacian_var = float(lap.var())
    return std, laplacian_var


def detect_plant_leaf(image: Image.Image, model_confidence: float = 1.0) -> tuple[bool, str, dict]:
    """
    Kiem tra toan dien xem anh co phai la la hoac bo phan cay trong hop le hay khong.
    Chan tuyet doi:
      - Con nguoi / khuon mat
      - Quan ao / trang phuc (ke ca quan ao mau xanh la)
      - Xe co / phuong tien
      - Do vat trong phong / mat phang nhan tao / phong canh
      - Anh mo hoac do tin cay qua thap
    Cho phep:
      - La xanh khoe manh
      - La bi benh hoai tu vang, nau, den, gỉ sat
      - Hoa, qua cay trong (ca chua, ot do, qua co mui)
    """
    std, laplacian_var = compute_texture_metrics(image)

    # 1. Kiem tra anh trong / don sac / mat phang khong co ket cau
    if std < 12.0 or laplacian_var < 15.0:
        return (
            False,
            "Hình ảnh quá đơn sắc hoặc là bề mặt phẳng nhân tạo (bức tường, giấy màu, vải trơn), không phát hiện kết cấu gân lá tự nhiên. Vui lòng chụp lại cận cảnh một chiếc lá cây.",
            {
                "std": round(std, 1),
                "laplacian_var": round(laplacian_var, 1),
                "confidence": round(model_confidence * 100, 1),
                "detected_name": "Bề mặt phẳng nhân tạo / Ảnh trống",
            },
        )

    # 2. Phan tich pho mau thuc vat da giai (Botanical Multi-tone spectrum)
    img_rgb = image.convert("RGB")
    img_hsv = np.array(img_rgb.convert("HSV"), dtype=np.float32)
    hue = img_hsv[:, :, 0] / 255.0 * 360.0
    sat = img_hsv[:, :, 1] / 255.0
    val = img_hsv[:, :, 2] / 255.0

    # 2.1 Xanh la cay (Diep luc)
    green_mask = (hue >= 35) & (hue <= 165) & (sat >= 0.15) & (val >= 0.15)
    green_ratio = float(green_mask.mean())

    # 2.2 Vang chanh / Vang gân la (Benh vang la, ri sat)
    yellow_mask = (hue >= 20) & (hue < 35) & (sat >= 0.18) & (val >= 0.18)
    yellow_ratio = float(yellow_mask.mean())

    # 2.3 Nau / Den hoai tu (Thoi la, chay la som/muon, bac la)
    brown_mask = (hue >= 10) & (hue < 35) & (sat >= 0.12) & (sat <= 0.75) & (val >= 0.08) & (val <= 0.70)
    brown_ratio = float(brown_mask.mean())

    # 2.4 Do qua / Thanthu (Ca chua, ot, thoi do)
    red_mask = ((hue >= 340) | (hue < 15)) & (sat >= 0.22) & (val >= 0.18)
    red_ratio = float(red_mask.mean())

    # Tong ty le sac thai thuc vat hop le
    plant_tone_mask = green_mask | yellow_mask | brown_mask | red_mask
    plant_tone_ratio = float(plant_tone_mask.mean())

    # 3. Phat hien sac to da nguoi (YCbCr)
    ycbcr = np.array(image.convert("YCbCr"), dtype=np.float32)
    cb = ycbcr[:, :, 1]
    cr = ycbcr[:, :, 2]
    skin_mask = (cb >= 77) & (cb <= 127) & (cr >= 133) & (cr <= 173)
    skin_ratio = float(skin_mask.mean())

    # Nhan dien doi tuong ImageNet
    obj_type, obj_name_vi, obj_conf = identify_non_plant_object(image)

    metrics = {
        "std": round(std, 1),
        "laplacian_var": round(laplacian_var, 1),
        "green_ratio": round(green_ratio * 100, 1),
        "plant_tone_ratio": round(plant_tone_ratio * 100, 1),
        "skin_ratio": round(skin_ratio * 100, 1),
        "confidence": round(model_confidence * 100, 1),
        "detected_type": obj_type,
        "detected_name": obj_name_vi,
        "detected_conf": round(obj_conf * 100, 1),
    }

    # QUY TAC 1: CHAN CON NGUOI / KHUON MAT
    # Con nguoi / khuon mat co ti le da nguoi dang ke va thieu pho mau thuc vat tu nhien
    is_human_skin = (
        (skin_ratio > 0.18 and green_ratio < 0.20 and plant_tone_ratio < 0.60)
        or (skin_ratio > 0.35 and plant_tone_ratio < 0.65)
    )
    if is_human_skin:
        metrics["detected_name"] = "con người / khuôn mặt"
        return (
            False,
            "Phát hiện hình ảnh có chứa con người / khuôn mặt chứ không phải cây trồng. Vui lòng hướng camera vào một chiếc lá cây cần chẩn đoán!",
            metrics,
        )


    # QUY TAC 2: CHAN QUAN AO / TRANG PHUC (ke ca quan ao mau xanh la)
    if obj_type == "TRANG_PHUC":
        return (
            False,
            f"Phát hiện hình ảnh có chứa {obj_name_vi} (quần áo/vải vóc) chứ không phải cây trồng. Vui lòng chụp lại ảnh lá cây!",
            metrics,
        )

    # QUY TAC 3: CHAN XE CO / DIEN TU / DONG VAT / NOI THAT
    if obj_type in ["XE_CO", "DIEN_TU", "DONG_VAT", "NOI_THAT"]:
        return (
            False,
            f"Phát hiện hình ảnh có chứa {obj_name_vi} chứ không phải cây trồng. Vui lòng chụp lại ảnh lá hoặc bộ phận cây cần chẩn đoán!",
            metrics,
        )

    # QUY TAC 4: CHAN DO VAT / PHONG CANH THIEU HOAN TOAN SAC THAI THUC VAT
    if plant_tone_ratio < 0.18:
        target_name = obj_name_vi if obj_type == "DO_VAT" else "đồ vật / môi trường xung quanh"
        metrics["detected_name"] = target_name
        return (
            False,
            f"Hình ảnh chứa {target_name} và thiếu sắc tố sinh học thực vật (chỉ có {metrics['plant_tone_ratio']}% màu lá/cây). Vui lòng chụp lại cận cảnh một chiếc lá!",
            metrics,
        )

    # QUY TAC 5: DO TIN CAY MO HINH QUA THAP (< 35%)
    if model_confidence < 0.35:
        return (
            False,
            f"Độ tin cậy của mô hình quá thấp (chỉ đạt {metrics['confidence']}%). Hình ảnh có thể bị mờ hoặc không thuộc danh mục cây trồng được hỗ trợ. Vui lòng chụp lại rõ nét!",
            metrics,
        )

    return True, "Phát hiện cây trồng hợp lệ.", metrics
