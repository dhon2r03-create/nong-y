"""
Web app chan doan benh cay trong.

Chay server:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Sau do mo trinh duyet:
    http://localhost:8000            -> trang chup/gui anh
    http://localhost:8000/dashboard  -> trang thong ke
"""
from __future__ import annotations

import io
import json
import os
import socket
import uuid
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
import re
import sys
from typing import Optional

# Tu dong nap backend dir va site-packages tu .venv va vendor
_BACKEND_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

_VENDOR_DIR = _BACKEND_DIR / "vendor"
if _VENDOR_DIR.exists() and str(_VENDOR_DIR) not in sys.path:
    sys.path.insert(0, str(_VENDOR_DIR))

for _candidate in [
    _ROOT_DIR / ".venv" / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages",
    _ROOT_DIR / ".venv" / "lib" / "python3.9" / "site-packages",
]:
    if _candidate.exists() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

import torch
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile

from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import DiagnosisCase, SessionLocal, get_db, init_db
from model import generate_gradcam_overlay, get_inference_transform, load_trained_model
from plant_detector import detect_plant_leaf
from treatments import get_treatment_suggestion
from translations import get_plant_key, get_supported_plants, translate_class_label



BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
MODELS_DIR = ROOT_DIR / "models"
UPLOADS_DIR = ROOT_DIR / "data" / "uploads"
FRONTEND_DIR = ROOT_DIR / "frontend"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Plant Disease Diagnosis App")

# ---------------------------------------------------------------------------
# Nap mo hinh (neu da huan luyen)
# ---------------------------------------------------------------------------
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL = None
CLASS_NAMES: list[str] = []
TRANSFORM = get_inference_transform()


def get_lan_ip() -> str:
    """Lay dia chi IP mang noi bo (LAN / Wi-Fi) de thiet bi khac co the truy cap."""
    # Cach 1: Thu ket noi socket ngoai mang
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    # Cach 2: Duyet danh sach host IP
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
    except Exception:
        pass

    # Cach 3: Parse ifconfig (macOS / Linux)
    try:
        import subprocess

        out = subprocess.check_output("ifconfig | grep 'inet ' | grep -v 127.0.0.1", shell=True).decode()
        for line in out.strip().split("\n"):
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0] == "inet":
                candidate = parts[1]
                if not candidate.startswith("127.") and not candidate.startswith("169.254."):
                    return candidate
    except Exception:
        pass

    return "127.0.0.1"


def try_load_model():
    global MODEL, CLASS_NAMES
    weights_path = MODELS_DIR / "plant_disease_model.pth"
    classes_path = MODELS_DIR / "class_names.json"
    if weights_path.exists() and classes_path.exists():
        with open(classes_path, "r", encoding="utf-8") as f:
            CLASS_NAMES = json.load(f)
        MODEL = load_trained_model(str(weights_path), num_classes=len(CLASS_NAMES), device=DEVICE)
        print(f"[INFO] Da nap mo hinh voi {len(CLASS_NAMES)} nhan.")
    else:
        print(
            "[WARN] Chua tim thay mo hinh da huan luyen trong thu muc models/. "
            "Hay chay: python train.py --data_dir ../data/train"
        )


def parse_plant_disease(label: str) -> tuple[str, str]:
    """Tách và việt hóa tên cây và tên bệnh từ nhãn mô hình dạng 'TenCay___TenBenh'."""
    return translate_class_label(label)



@app.on_event("startup")
def on_startup():
    init_db()
    try_load_model()


# ---------------------------------------------------------------------------
# API: Danh sach cac loai cay trong ho tro
# ---------------------------------------------------------------------------
@app.get("/api/plants")
def get_plants():
    return get_supported_plants()


# ---------------------------------------------------------------------------
# API: du doan benh tu anh
# ---------------------------------------------------------------------------
@app.post("/api/predict")
async def predict(
    file: UploadFile = File(...),
    plant_filter: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
):
    if MODEL is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Mo hinh chua duoc huan luyen. Hay dat dataset vao data/train/ "
                "va chay train.py truoc khi su dung tinh nang nay."
            ),
        )

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="File tai len khong phai la anh hop le.")

    # Luu anh
    ext = Path(file.filename or "upload.jpg").suffix or ".jpg"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = UPLOADS_DIR / saved_name
    image.save(saved_path)

    # Du doan voi mo hinh
    input_tensor = TRANSFORM(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        outputs = MODEL(input_tensor)
        all_probs = torch.nn.functional.softmax(outputs, dim=1)[0]

    # Tinh toan xac suat loai cay tong hop
    plant_probs = defaultdict(float)
    for i, c in enumerate(CLASS_NAMES):
        pkey = get_plant_key(c)
        plant_probs[pkey] += float(all_probs[i].item())

    # Xu ly neu co plant_filter (Loc theo loai cay cu the de tranh nhan nham cay)
    active_filter = (plant_filter or "").strip()
    is_filtered = bool(active_filter and active_filter.lower() != "auto")

    if is_filtered:
        matching_indices = [
            i for i, c in enumerate(CLASS_NAMES)
            if get_plant_key(c).lower() == active_filter.lower()
        ]
        if matching_indices:
            masked_logits = outputs.clone()[0]
            mask = torch.ones_like(masked_logits, dtype=torch.bool)
            mask[matching_indices] = False
            masked_logits[mask] = -float("inf")
            target_probs = torch.nn.functional.softmax(masked_logits, dim=0)
            overall_conf = float(torch.max(target_probs).item())
        else:
            target_probs = all_probs
            overall_conf = float(torch.max(all_probs).item())
    else:
        target_probs = all_probs
        overall_conf = float(torch.max(all_probs).item())

    # Kiem tra xem anh co phai la cay trong hop le hay khong
    is_plant, reason, metrics = detect_plant_leaf(image, model_confidence=overall_conf)
    if not is_plant:
        return {
            "is_plant": False,
            "message": reason,
            "confidence": round(overall_conf * 100, 2),
            "metrics": metrics,
            "detected_object": metrics.get("detected_name", "Vật thể không xác định"),
            "suggested_action": "Vui lòng chụp lại cận cảnh một chiếc lá cây hoặc bộ phận cây trồng có dấu hiệu bệnh, đủ ánh sáng và không bị mờ nhòe.",
            "image_url": f"/uploads/{saved_name}",
        }

    # Trich xuat Top 3 chan doan kha di nhat
    num_top = min(3, len(CLASS_NAMES))
    topk_vals, topk_indices = torch.topk(target_probs, num_top)

    top1_idx = topk_indices[0].item()
    top1_conf = float(topk_vals[0].item())
    top1_label = CLASS_NAMES[top1_idx]
    plant_name, disease_name = parse_plant_disease(top1_label)
    top1_treatment_dict = get_treatment_suggestion(disease_name)

    # Sinh anh nhiet Grad-CAM (Heatmap)
    gradcam_name = f"gradcam_{saved_name}"
    gradcam_path = UPLOADS_DIR / gradcam_name
    try:
        gradcam_img = generate_gradcam_overlay(MODEL, image, class_idx=top1_idx, device=DEVICE)
        gradcam_img.save(gradcam_path, quality=92)
        heatmap_url = f"/uploads/{gradcam_name}"
    except Exception as e:
        print(f"[WARN] Khong the tao Grad-CAM: {e}")
        heatmap_url = None

    # Xay dung danh sach Top 3 du doan
    top_predictions = []
    for val, idx in zip(topk_vals, topk_indices):
        c_label = CLASS_NAMES[idx.item()]
        p_name, d_name = parse_plant_disease(c_label)
        t_data = get_treatment_suggestion(d_name)
        top_predictions.append({
            "plant_name": p_name,
            "disease_name": d_name,
            "raw_label": c_label,
            "confidence": round(float(val.item()) * 100, 2),
            "severity": t_data.get("severity", "Trung bình"),
            "summary": t_data.get("summary", ""),
        })

    # Xac dinh xac suat loai cay
    top_plant_key = get_plant_key(top1_label)
    plant_species_confidence = round(plant_probs.get(top_plant_key, top1_conf) * 100, 2)

    lat_val = None
    try:
        if latitude is not None and not hasattr(latitude, "default"):
            lat_val = float(latitude)
    except (ValueError, TypeError):
        lat_val = None

    lon_val = None
    try:
        if longitude is not None and not hasattr(longitude, "default"):
            lon_val = float(longitude)
    except (ValueError, TypeError):
        lon_val = None

    case = DiagnosisCase(
        image_path=f"/uploads/{saved_name}",
        plant_name=plant_name,
        disease_name=disease_name,
        confidence=top1_conf,
        treatment=top1_treatment_dict.get("summary", ""),
        latitude=lat_val,
        longitude=lon_val,
        created_at=datetime.utcnow(),
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    return {
        "is_plant": True,
        "id": case.id,
        "plant_name": plant_name,
        "disease_name": disease_name,
        "confidence": round(top1_conf * 100, 2),
        "plant_species_confidence": plant_species_confidence,
        "treatment": top1_treatment_dict,
        "top_predictions": top_predictions,
        "image_url": case.image_path,
        "heatmap_url": heatmap_url,
        "created_at": case.created_at.isoformat(),
        "is_filtered_by_plant": is_filtered,
    }



# ---------------------------------------------------------------------------
# API: du lieu dashboard
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    total_cases = db.query(func.count(DiagnosisCase.id)).scalar() or 0

    by_plant_rows = (
        db.query(DiagnosisCase.plant_name, func.count(DiagnosisCase.id))
        .group_by(DiagnosisCase.plant_name)
        .order_by(func.count(DiagnosisCase.id).desc())
        .all()
    )
    by_plant = [{"plant_name": p, "count": c} for p, c in by_plant_rows]

    by_disease_rows = (
        db.query(DiagnosisCase.disease_name, func.count(DiagnosisCase.id))
        .group_by(DiagnosisCase.disease_name)
        .order_by(func.count(DiagnosisCase.id).desc())
        .limit(10)
        .all()
    )
    by_disease = [{"disease_name": d, "count": c} for d, c in by_disease_rows]

    all_cases = db.query(DiagnosisCase.created_at, DiagnosisCase.disease_name).all()
    by_date_map = defaultdict(lambda: {"count": 0, "sick": 0, "healthy": 0})
    by_hour_today_map = defaultdict(lambda: {"count": 0, "sick": 0, "healthy": 0})

    dates_in_db = [c[0].strftime("%Y-%m-%d") for c in all_cases if c[0]]
    latest_date_str = max(dates_in_db) if dates_in_db else datetime.utcnow().strftime("%Y-%m-%d")

    for created_at, disease_name in all_cases:
        if created_at:
            d_str = created_at.strftime("%Y-%m-%d")
            name_lower = (disease_name or "").lower()
            is_healthy_case = any(k in name_lower for k in ["khoe", "khỏe", "healthy"])
            by_date_map[d_str]["count"] += 1
            if is_healthy_case:
                by_date_map[d_str]["healthy"] += 1
            else:
                by_date_map[d_str]["sick"] += 1

            if d_str == latest_date_str:
                h_str = created_at.strftime("%H:00")
                by_hour_today_map[h_str]["count"] += 1
                if is_healthy_case:
                    by_hour_today_map[h_str]["healthy"] += 1
                else:
                    by_hour_today_map[h_str]["sick"] += 1

    by_date = [
        {
            "date": d,
            "count": data["count"],
            "sick": data["sick"],
            "healthy": data["healthy"],
        }
        for d, data in sorted(by_date_map.items())
    ]

    by_hour_today = [
        {
            "hour": f"{h:02d}:00",
            "count": by_hour_today_map[f"{h:02d}:00"]["count"],
            "sick": by_hour_today_map[f"{h:02d}:00"]["sick"],
            "healthy": by_hour_today_map[f"{h:02d}:00"]["healthy"],
        }
        for h in range(24)
    ]

    healthy_count = (
        db.query(func.count(DiagnosisCase.id))
        .filter(
            (func.lower(DiagnosisCase.disease_name).like("%khoe%"))
            | (func.lower(DiagnosisCase.disease_name).like("%khỏe%"))
            | (func.lower(DiagnosisCase.disease_name).like("%healthy%"))
        )
        .scalar()
        or 0
    )

    return {
        "total_cases": total_cases,
        "healthy_count": healthy_count,
        "sick_count": total_cases - healthy_count,
        "by_plant": by_plant,
        "by_disease": by_disease,
        "by_date": by_date,
        "by_hour_today": by_hour_today,
        "latest_date": latest_date_str,
    }


@app.get("/api/cases")
def list_cases(limit: int = 100, db: Session = Depends(get_db)):
    cases = (
        db.query(DiagnosisCase)
        .order_by(DiagnosisCase.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": c.id,
            "plant_name": c.plant_name,
            "disease_name": c.disease_name,
            "confidence": round(c.confidence * 100, 2),
            "treatment": c.treatment,
            "image_url": c.image_path,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in cases
    ]


@app.get("/api/model-status")
def model_status():
    return {
        "model_loaded": MODEL is not None,
        "num_classes": len(CLASS_NAMES),
        "class_names": CLASS_NAMES,
    }


@app.get("/api/network-info")
def network_info():
    ip = get_lan_ip()
    port = int(os.getenv("PORT", 8000))

    # Kiem tra xem co Public URL (Render, Cloudflare, Pinggy, Ngrok...) hay khong
    public_url = os.getenv("PUBLIC_URL") or os.getenv("RENDER_EXTERNAL_URL")
    if not public_url:
        url_file = ROOT_DIR / ".public_url"
        if url_file.exists():
            try:
                val = url_file.read_text(encoding="utf-8").strip()
                if val.startswith("http"):
                    public_url = val
            except Exception:
                pass

    active_url = public_url if public_url else f"http://{ip}:{port}"
    svg_qr = generate_qr_svg(active_url)

    return {
        "local_ip": ip,
        "port": port,
        "local_url": f"http://localhost:{port}",
        "lan_url": active_url,
        "is_public": bool(public_url),
        "qr_svg": svg_qr,
    }


def generate_qr_svg(active_url: str) -> str:
    """Tạo chuỗi SVG mã QR chuẩn, sắc nét, có nền trắng và căn chỉnh hoàn hảo cho mobile."""
    if not active_url:
        return ""
    try:
        import qrcode
        import qrcode.image.svg

        class CrispSvgImage(qrcode.image.svg.SvgPathImage):
            background = "#ffffff"
            QR_PATH_STYLE = {
                "fill": "#0f172a",
                "fill-opacity": "1",
                "fill-rule": "nonzero",
                "stroke": "none",
            }

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
            image_factory=CrispSvgImage,
        )
        qr.add_data(active_url)
        qr.make(fit=True)
        img = qr.make_image()
        buf = io.BytesIO()
        img.save(buf)
        raw_svg = buf.getvalue().decode("utf-8")

        # Bỏ <?xml ...?> và ép width="100%" height="100%" để responsive
        clean_svg = re.sub(r"<\?xml[^>]*\?>\s*", "", raw_svg).strip()
        clean_svg = re.sub(r'width="\d+mm"', 'width="100%"', clean_svg)
        clean_svg = re.sub(r'height="\d+mm"', 'height="100%"', clean_svg)
        return clean_svg
    except Exception as e:
        print(f"⚠️ [QR Error] Không thể tạo QR SVG: {e}")
        return ""


@app.get("/api/qr-code")
def get_qr_code(url: Optional[str] = None):
    """Phục vụ ảnh SVG QR code trực tiếp cho URL bất kỳ hoặc LAN URL hiện tại."""
    target_url = url
    if not target_url:
        info = network_info()
        target_url = info["lan_url"]
    svg_data = generate_qr_svg(target_url)
    return Response(content=svg_data, media_type="image/svg+xml")



# ---------------------------------------------------------------------------
# Phuc vu frontend
# ---------------------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")


@app.get("/")
def serve_index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/dashboard")
def serve_dashboard():
    return FileResponse(str(FRONTEND_DIR / "dashboard.html"))


if __name__ == "__main__":
    import uvicorn

    lan_ip = get_lan_ip()
    port = 8000
    print("\n" + "=" * 64)
    print("🌱 NÔNG Y - HỆ THỐNG CHẨN ĐOÁN BỆNH CÂY TRỒNG BẰNG AI")
    print("-" * 64)
    print(f"💻 Truy cập trên máy tính này:     http://localhost:{port}")
    print(f"📱 Truy cập từ điện thoại/máy khác (cùng Wi-Fi):")
    print(f"   👉 http://{lan_ip}:{port}")
    print("=" * 64 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=port)


