"""
Module viet hoa ten cay trong va ten cac loai benh.
"""
from __future__ import annotations

import re
import unicodedata


def _normalize(text: str) -> str:
    """Chuan hoa chuoi ve chu thuong, bo dau, bo ky tu dac biet."""
    text = text.replace("đ", "d").replace("Đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"[\s_-]+", " ", text).strip().lower()


# Danh muc dich ten cay trong
PLANT_MAP: dict[str, str] = {
    "apple": "Táo",
    "cherry": "Anh đào (Cherry)",
    "citrus": "Cây có múi (Cam, bưởi)",
    "corn": "Bắp (Ngô)",
    "cotton": "Cây bông",
    "grape": "Nho",
    "peach": "Đào",
    "pepper bell": "Ớt chuông",
    "pepper_bell": "Ớt chuông",
    "pepper": "Ớt chuông",
    "potato": "Khoai tây",
    "rice": "Lúa",
    "strawberry": "Dâu tây",
    "sugarcane": "Mía",
    "tomato": "Cà chua",
    "wheat": "Lúa mì",
}

# Danh muc dich ten benh theo nhan cu the (TenCay___TenBenh)
EXACT_CLASS_MAP: dict[str, tuple[str, str]] = {
    "Apple___Black_rot": ("Táo", "Bệnh thối đen"),
    "Apple___Cedar_apple_rust": ("Táo", "Bệnh rỉ sắt táo"),
    "Apple___healthy": ("Táo", "Khỏe mạnh"),
    "Apple___scab": ("Táo", "Bệnh ghẻ táo (Scab)"),
    "Cherry___Healthy": ("Anh đào (Cherry)", "Khỏe mạnh"),
    "Cherry___Powdery_mildew": ("Anh đào (Cherry)", "Bệnh phấn trắng"),
    "Citrus___Black_spot": ("Cây có múi (Cam, bưởi)", "Bệnh đốm đen"),
    "Citrus___Healthy": ("Cây có múi (Cam, bưởi)", "Khỏe mạnh"),
    "Citrus___canker": ("Cây có múi (Cam, bưởi)", "Bệnh loét vi khuẩn"),
    "Citrus___greening": ("Cây có múi (Cam, bưởi)", "Bệnh vàng lá gân xanh (Greening)"),
    "Corn___Common_rust": ("Bắp (Ngô)", "Bệnh rỉ sắt"),
    "Corn___Northern_Leaf_Blight": ("Bắp (Ngô)", "Bệnh cháy lá lớn"),
    "Corn___cercospora_gray_leaf_spot": ("Bắp (Ngô)", "Bệnh đốm lá xám Cercospora"),
    "Corn___healthy": ("Bắp (Ngô)", "Khỏe mạnh"),
    "Cotton___bacterial_blight": ("Cây bông", "Bệnh cháy lá vi khuẩn"),
    "Cotton___curl_virus": ("Cây bông", "Bệnh xoăn lá do virus"),
    "Cotton___fussarium_wilt": ("Cây bông", "Bệnh héo rũ Fusarium"),
    "Cotton___healthy": ("Cây bông", "Khỏe mạnh"),
    "Grape___Black_Measles": ("Nho", "Bệnh sởi đen (Esca)"),
    "Grape___Black_rot": ("Nho", "Bệnh thối đen"),
    "Grape___Healthy": ("Nho", "Khỏe mạnh"),
    "Grape___Isariopsis_Leaf_Spot": ("Nho", "Bệnh đốm lá Isariopsis"),
    "Peach___Bacterial_spot": ("Đào", "Bệnh đốm lá vi khuẩn"),
    "Peach___Healthy": ("Đào", "Khỏe mạnh"),
    "Pepper_bell___Bacterial_spot": ("Ớt chuông", "Bệnh đốm lá vi khuẩn"),
    "Pepper_bell___healthy": ("Ớt chuông", "Khỏe mạnh"),
    "Potato___Early_blight": ("Khoai tây", "Bệnh đốm vòng (Cháy lá sớm)"),
    "Potato___Late_blight": ("Khoai tây", "Bệnh sương mai"),
    "Potato___healthy": ("Khoai tây", "Khỏe mạnh"),
    "Rice___Bacterial_Leaf_Blight": ("Lúa", "Bệnh bạc lá vi khuẩn"),
    "Rice___Brown_Spot": ("Lúa", "Bệnh đốm nâu"),
    "Rice___Healthy": ("Lúa", "Khỏe mạnh"),
    "Rice___Leaf_Blast": ("Lúa", "Bệnh đạo ôn lá"),
    "Rice___Leaf_scald": ("Lúa", "Bệnh cháy chóp lá (Bỏng lá)"),
    "Rice___Sheath_Blight": ("Lúa", "Bệnh khô vằn (Đốm vằn)"),
    "Strawberry___Healthy": ("Dâu tây", "Khỏe mạnh"),
    "Strawberry___Leaf_scorch": ("Dâu tây", "Bệnh cháy mép lá"),
    "Sugarcane___Healthy": ("Mía", "Khỏe mạnh"),
    "Sugarcane___Mosaic_Virus": ("Mía", "Bệnh khảm lá do virus"),
    "Sugarcane___RedRot": ("Mía", "Bệnh thối đỏ thân"),
    "Sugarcane___Rust": ("Mía", "Bệnh rỉ sắt"),
    "Sugarcane___Yellow": ("Mía", "Bệnh vàng lá"),
    "Tomato___Bacterial_spot": ("Cà chua", "Bệnh đốm vi khuẩn"),
    "Tomato___Early_blight": ("Cà chua", "Bệnh đốm vòng (Cháy lá sớm)"),
    "Tomato___Late_blight": ("Cà chua", "Bệnh sương mai"),
    "Tomato___Leaf_Mold": ("Cà chua", "Bệnh mốc lá"),
    "Tomato___Septoria_leaf_spot": ("Cà chua", "Bệnh đốm lá Septoria"),
    "Tomato___Spider_mites": ("Cà chua", "Nhện đỏ hại lá"),
    "Tomato___Target_Spot": ("Cà chua", "Bệnh đốm mục tiêu"),
    "Tomato___YellowLeaf_Curl_Virus": ("Cà chua", "Bệnh xoăn vàng lá virus"),
    "Tomato___healthy": ("Cà chua", "Khỏe mạnh"),
    "Tomato___mosaic_virus": ("Cà chua", "Bệnh khảm lá do virus"),
    "Wheat___Aphid": ("Lúa mì", "Rệp hại lúa mì"),
    "Wheat___Black_Rust": ("Lúa mì", "Bệnh rỉ sắt đen"),
    "Wheat___Blast": ("Lúa mì", "Bệnh đạo ôn lúa mì"),
    "Wheat___Brown_Rust": ("Lúa mì", "Bệnh rỉ sắt nâu"),
    "Wheat___Common_Root_Rot": ("Lúa mì", "Bệnh thối rễ"),
    "Wheat___Fusarium_Head_Blight": ("Lúa mì", "Bệnh bạc bông Fusarium"),
    "Wheat___Healthy": ("Lúa mì", "Khỏe mạnh"),
    "Wheat___Leaf_Blight": ("Lúa mì", "Bệnh cháy lá lúa mì"),
    "Wheat___Mildew": ("Lúa mì", "Bệnh phấn trắng"),
    "Wheat___Mite": ("Lúa mì", "Nhện hại lúa mì"),
    "Wheat___Septoria": ("Lúa mì", "Bệnh đốm lá Septoria"),
    "Wheat___Smut": ("Lúa mì", "Bệnh than đen"),
    "Wheat___Stem_fly": ("Lúa mì", "Ruồi đục thân lúa mì"),
    "Wheat___Tan_spot": ("Lúa mì", "Bệnh đốm vàng rám"),
    "Wheat___Yellow_Rust": ("Lúa mì", "Bệnh rỉ sắt vàng"),
}

# Tra cuu ten benh theo tu khoa normalized
DISEASE_KEYWORD_MAP: list[tuple[str, str]] = [
    ("common root rot", "Bệnh thối rễ"),
    ("root rot", "Bệnh thối rễ"),
    ("black rot", "Bệnh thối đen"),
    ("red rot", "Bệnh thối đỏ thân"),
    ("redrot", "Bệnh thối đỏ thân"),
    ("bacterial leaf blight", "Bệnh bạc lá vi khuẩn"),
    ("bacterial spot", "Bệnh đốm vi khuẩn"),
    ("bacterial blight", "Bệnh cháy lá vi khuẩn"),
    ("northern leaf blight", "Bệnh cháy lá lớn"),
    ("early blight", "Bệnh đốm vòng (Cháy lá sớm)"),
    ("late blight", "Bệnh sương mai"),
    ("leaf blight", "Bệnh cháy lá"),
    ("fusarium head blight", "Bệnh bạc bông Fusarium"),
    ("sheath blight", "Bệnh khô vằn (Đốm vằn)"),
    ("blight", "Bệnh cháy lá"),
    ("leaf blast", "Bệnh đạo ôn lá"),
    ("blast", "Bệnh đạo ôn"),
    ("powdery mildew", "Bệnh phấn trắng"),
    ("mildew", "Bệnh phấn trắng"),
    ("cedar apple rust", "Bệnh rỉ sắt táo"),
    ("black rust", "Bệnh rỉ sắt đen"),
    ("brown rust", "Bệnh rỉ sắt nâu"),
    ("yellow rust", "Bệnh rỉ sắt vàng"),
    ("common rust", "Bệnh rỉ sắt"),
    ("rust", "Bệnh rỉ sắt"),
    ("cercospora gray leaf spot", "Bệnh đốm lá xám Cercospora"),
    ("gray leaf spot", "Bệnh đốm lá xám"),
    ("septoria leaf spot", "Bệnh đốm lá Septoria"),
    ("isariopsis leaf spot", "Bệnh đốm lá Isariopsis"),
    ("target spot", "Bệnh đốm mục tiêu"),
    ("brown spot", "Bệnh đốm nâu"),
    ("black spot", "Bệnh đốm đen"),
    ("tan spot", "Bệnh đốm vàng rám"),
    ("leaf spot", "Bệnh đốm lá"),
    ("spot", "Bệnh đốm lá"),
    ("leaf scorch", "Bệnh cháy mép lá"),
    ("leaf scald", "Bệnh cháy chóp lá (Bỏng lá)"),
    ("leaf mold", "Bệnh mốc lá"),
    ("spider mites", "Nhện đỏ hại lá"),
    ("mite", "Nhện hại cây"),
    ("aphid", "Rệp hại cây"),
    ("stem fly", "Ruồi đục thân"),
    ("smut", "Bệnh than đen"),
    ("scab", "Bệnh ghẻ (Scab)"),
    ("canker", "Bệnh loét vi khuẩn"),
    ("greening", "Bệnh vàng lá gân xanh (Greening)"),
    ("yellowleaf curl virus", "Bệnh xoăn vàng lá virus"),
    ("yellow leaf curl virus", "Bệnh xoăn vàng lá virus"),
    ("curl virus", "Bệnh xoăn lá do virus"),
    ("mosaic virus", "Bệnh khảm lá do virus"),
    ("mosaic", "Bệnh khảm lá do virus"),
    ("fussarium wilt", "Bệnh héo rũ Fusarium"),
    ("fusarium wilt", "Bệnh héo rũ Fusarium"),
    ("black measles", "Bệnh sởi đen (Esca)"),
    ("yellow", "Bệnh vàng lá"),
    ("rot", "Bệnh thối"),
    ("healthy", "Khỏe mạnh"),
    ("khoe manh", "Khỏe mạnh"),
]


def translate_plant(plant_raw: str) -> str:
    """Dich ten cay sang tieng Viet."""
    norm = _normalize(plant_raw)
    if norm in PLANT_MAP:
        return PLANT_MAP[norm]
    for k, v in PLANT_MAP.items():
        if k in norm:
            return v
    return plant_raw.replace("_", " ").title()


def translate_disease(disease_raw: str) -> str:
    """Dich ten benh sang tieng Viet."""
    norm = _normalize(disease_raw)
    for kw, vi_name in DISEASE_KEYWORD_MAP:
        if kw in norm:
            return vi_name
    return disease_raw.replace("_", " ").title()


def translate_class_label(label: str) -> tuple[str, str]:
    """
    Chuyen doi nhan lop (vi du 'Wheat___Common_Root_Rot') thanh
    (ten_cay_tieng_viet, ten_benh_tieng_viet).
    """
    if label in EXACT_CLASS_MAP:
        return EXACT_CLASS_MAP[label]

    if "___" in label:
        plant_part, disease_part = label.split("___", 1)
        return translate_plant(plant_part), translate_disease(disease_part)

    norm = _normalize(label)
    for kw, vi_disease in DISEASE_KEYWORD_MAP:
        if kw in norm:
            return "Cây trồng", vi_disease

    return "Cây trồng", label.replace("_", " ").title()


SUPPORTED_PLANTS: list[dict[str, str]] = [
    {"id": "auto", "name": "Tự động nhận diện (Tất cả 14 loài cây)", "icon": "🌱"},
    {"id": "Tomato", "name": "Cà chua (Tomato)", "icon": "🍅"},
    {"id": "Citrus", "name": "Cây có múi - Cam, chanh, bưởi (Citrus)", "icon": "🍊"},
    {"id": "Rice", "name": "Lúa (Rice)", "icon": "🌾"},
    {"id": "Corn", "name": "Bắp / Ngô (Corn)", "icon": "🌽"},
    {"id": "Potato", "name": "Khoai tây (Potato)", "icon": "🥔"},
    {"id": "Pepper_bell", "name": "Ớt chuông (Pepper)", "icon": "🫑"},
    {"id": "Grape", "name": "Nho (Grape)", "icon": "🍇"},
    {"id": "Apple", "name": "Táo (Apple)", "icon": "🍎"},
    {"id": "Strawberry", "name": "Dâu tây (Strawberry)", "icon": "🍓"},
    {"id": "Sugarcane", "name": "Mía (Sugarcane)", "icon": "🎋"},
    {"id": "Wheat", "name": "Lúa mì (Wheat)", "icon": "🌾"},
    {"id": "Cotton", "name": "Cây bông (Cotton)", "icon": "☁️"},
    {"id": "Peach", "name": "Đào (Peach)", "icon": "🍑"},
    {"id": "Cherry", "name": "Anh đào / Cherry", "icon": "🍒"},
]


def get_plant_key(label: str) -> str:
    """Lay ma dinh danh loai cay tu nhan (vd 'Tomato___Bacterial_spot' -> 'Tomato')."""
    if "___" in label:
        return label.split("___", 1)[0]
    return "Unknown"


def get_supported_plants() -> list[dict[str, str]]:
    """Tra ve danh muc tat ca loai cay ho tro de hien thi tren giao dien."""
    return SUPPORTED_PLANTS

