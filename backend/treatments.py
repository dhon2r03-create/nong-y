"""
Goi y bien phap xu ly benh cay trong (Tieng Viet chuan hoa co dau).

Ho tro tra cuu ca theo tu khoa tieng Viet va tieng Anh (khong phan biet
hoa/thuong, khong dau). Neu khong khop tu khoa nao, tra ve huong dan chung.
"""
from __future__ import annotations

import re
import unicodedata


def _strip_accents(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "d")
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def _normalize(text: str) -> str:
    return _strip_accents(text).lower().replace("_", " ").replace("-", " ")


# Danh sach quy tac xu ly benh co cau truc 4 ngan: (keywords, data_dict)
STRUCTURED_TREATMENTS: list[tuple[list[str], dict[str, str]]] = [
    (
        ["healthy", "khoe manh", "khoe"],
        {
            "severity": "An toàn",
            "summary": "Cây đang sinh trưởng khỏe mạnh, chưa phát hiện dấu hiệu nhiễm bệnh.",
            "emergency": "Chưa cần can thiệp xử lý khẩn cấp.",
            "biological": "Duy trì chế độ tưới nước vừa phải, bón phân hữu cơ cân đối N-P-K theo từng thời kỳ sinh trưởng.",
            "chemical": "Không cần sử dụng thuốc BVTV hóa học.",
            "prevention": "Thường xuyên thăm vườn định kỳ 2-3 ngày/lần, vệ sinh cỏ dại quanh gốc để phòng ngừa nấm bệnh xâm nhập.",
        },
    ),
    (
        ["thoi re", "root rot", "thoi goc", "thoi den", "thoi do", "black rot", "red rot", "redrot", "thoi", "rot"],
        {
            "severity": "Cao - Nguy hiểm",
            "summary": "Nghi bệnh thối rễ/thối củ hoặc thối thân do nấm đất. Cần khơi thông rãnh thoát nước ngay.",
            "emergency": "Cắt nước tưới, khơi thông rãnh thoát nước không để ứ đọng quanh gốc. Nhổ bỏ và đem đốt tiêu hủy các cây thối mục nặng.",
            "biological": "Xới nhẹ đất quanh tán cho thoáng khí; tưới chế phẩm vi sinh nấm đối kháng Trichoderma xung quanh vùng rễ.",
            "chemical": "Tưới gốc bằng thuốc trừ nấm có hoạt chất Metalaxyl, Mancozeb, Fosetyl-aluminium hoặc Hymexazol theo đúng nồng độ.",
            "prevention": "Lên luống cao, cải tạo độ pH đất bằng vôi bột trước khi trồng, luân canh cây trồng khác họ.",
        },
    ),
    (
        ["dao on", "blast", "leaf blast"],
        {
            "severity": "Cao - Lây lan rất nhanh",
            "summary": "Nghi bệnh đạo ôn hại lá (vết bệnh hình thoi, đốm mắt cua). Ngưng bón đạm ngay.",
            "emergency": "Tuyệt đối ngừng bón phân đạm (urê) và không phun phân bón lá có chứa đạm. Giữ mực nước ruộng 3-5cm.",
            "biological": "Dọn sạch cỏ dại bờ ruộng, không để ruộng quá rậm rạp, tăng cường bón phân Kali và Silic giúp lá cứng cáp.",
            "chemical": "Phun ngay thuốc đặc trị đạo ôn chứa hoạt chất Tricyclazole (Beam, Flash), Isoprothiolane (Fujione) hoặc Fenoxanil.",
            "prevention": "Sử dụng giống lúa kháng đạo ôn, gieo sạ mật độ vừa phải, xử lý hạt giống bằng thuốc trừ nấm trước khi gieo.",
        },
    ),
    (
        ["kho van", "sheath blight", "dom van"],
        {
            "severity": "Trung bình",
            "summary": "Nghi bệnh khô vằn (đốm vằn loang lổ như da hổ ở bẹ lá sát gốc).",
            "emergency": "Vạch tán lá, tỉa bỏ các lá già và bẹ lá úa ở tầng dưới đem tiêu hủy để tạo độ thông thoáng.",
            "biological": "Giảm lượng đạm, bón bổ sung kali và tro trấu. Tránh tưới phun ướt sũng gốc vào chiều muộn.",
            "chemical": "Phun thuốc đặc trị nấm Rhizoctonia solani có hoạt chất Validamycin, Hexaconazole (Anvil) hoặc Azoxystrobin.",
            "prevention": "Vệ sinh đồng ruộng sau thu hoạch, cày lật đất sớm phơi ải diệt hạch nấm tồn dư.",
        },
    ),
    (
        ["suong mai", "late blight", "moc suong"],
        {
            "severity": "Rất cao - Lây lan bùng phát",
            "summary": "Nghi bệnh sương mai (mốc sương do Phytophthora). Bệnh bùng phát cực nhanh khi trời âm u, ẩm độ cao.",
            "emergency": "Cắt tỉa ngay các lá và cành bị úng nước xám đen, cho vào túi nilon đem đốt tiêu hủy. Tuyệt đối ngưng tưới phun mưa.",
            "biological": "Tăng cường thông gió trong vườn/nhà màng, che phủ gốc bằng màng phủ nông nghiệp tránh nấm bắn từ đất lên lá.",
            "chemical": "Phun luân phiên thuốc trừ nấm nội hấp: Metalaxyl + Mancozeb (Ridomil Gold), Cymoxanil hoặc Dimethomorph.",
            "prevention": "Trồng mật độ thoáng, tránh trồng trũng thấp, phun phòng thuốc gốc đồng (Booc-đô, Champion) trước các đợt mưa phùn/sương mù.",
        },
    ),
    (
        ["dom vong", "early blight", "chay la som"],
        {
            "severity": "Trung bình",
            "summary": "Nghi bệnh đốm vòng (cháy lá sớm Alternaria với các vòng tròn đồng tâm).",
            "emergency": "Cắt bỏ toàn bộ lá già, lá sát mặt đất có đốm vòng nâu đen để ngăn bào tử nấm bắn lên tán trên.",
            "biological": "Tưới nước trực tiếp vào gốc vào buổi sáng sớm, không tưới làm ướt sũng mặt lá vào ban đêm.",
            "chemical": "Phun thuốc trừ nấm gốc đồng (Copper Oxychloride), Chlorothalonil (Daconil), Mancozeb hoặc Difenoconazole (Score).",
            "prevention": "Luân canh cây trồng ít nhất 2 năm, dọn sạch tàn dư lá bệnh sau mỗi vụ thu hoạch.",
        },
    ),
    (
        ["ri sat", "rust", "cedar apple rust", "black rust", "brown rust", "yellow rust"],
        {
            "severity": "Trung bình",
            "summary": "Nghi bệnh rỉ sắt (bột màu vàng cam hoặc nâu đỏ như gỉ kim loại trên mặt lá).",
            "emergency": "Tỉa bỏ cành lá bị ổ nấm gỉ sắt dày đặc, gom vào thùng rác kín tránh làm rơi rụng bột bào tử ra các cây lân cận.",
            "biological": "Cải tạo vườn tạo độ thông gió, không để cây thiếu sáng, bón lân và kali cân đối.",
            "chemical": "Phun thuốc có hoạt chất gốc Lưu huỳnh (Kumulus), Hexaconazole, Tebuconazole hoặc Mancozeb theo hướng dẫn.",
            "prevention": "Chọn giống cây kháng bệnh rỉ sắt, dọn sạch cỏ dại ký chủ phụ quanh khu vực canh tác.",
        },
    ),
    (
        ["phan trang", "powdery mildew", "mildew"],
        {
            "severity": "Trung bình",
            "summary": "Nghi bệnh phấn trắng (lớp phấn trắng xám mịn bao phủ bề mặt lá làm lá quăn queo).",
            "emergency": "Vặt bỏ các lá bị phủ kín phấn trắng, cách ly cây nhiễm bệnh nếu đang trồng trong chậu.",
            "biological": "Phun dung dịch sinh học: Baking soda (5g/lít nước) + vài giọt dầu ăn hoặc chế phẩm dầu khoáng SK Enspray 99 EC.",
            "chemical": "Phun thuốc trừ nấm chứa Dinocap, Hexaconazole, Trifloxystrobin hoặc Azoxystrobin (Amistar Top).",
            "prevention": "Bảo đảm ánh nắng chiếu đủ tới tán cây, hạ bớt độ ẩm nhà màng bằng quạt thông gió.",
        },
    ),
    (
        ["bac la", "bacterial leaf blight", "bacterial blight", "bacterial spot", "dom vi khuan", "chay la vi khuan", "loet vi khuan", "canker", "bacterial", "vi khuan"],
        {
            "severity": "Cao - Do vi khuẩn",
            "summary": "Nghi bệnh do vi khuẩn gây ra (cháy bìa lá, loét sần sùi có quầng vàng). Thuốc trừ nấm thông thường không có tác dụng!",
            "emergency": "Khử trùng kéo và dụng cụ cắt tỉa bằng cồn 70 độ. Cắt tỉa cành bệnh lúc trời khô ráo, tuyệt đối không làm lúc mưa ướt.",
            "biological": "Ngưng bón đạm thừa, phun bổ sung phân bón Silic và Canxi làm dày vách tế bào lá ngăn vi khuẩn xâm nhập.",
            "chemical": "Phun thuốc đặc trị vi khuẩn: Kasugamycin (Kasumin), Oxolinic acid (Starner), Bismerthiazol hoặc các chế phẩm gốc Đồng.",
            "prevention": "Tránh làm trầy xước thân lá khi chăm sóc, phòng trừ côn trùng chích hút tạo vết thương hở cho vi khuẩn.",
        },
    ),
    (
        ["vang la gan xanh", "greening", "huanglongbing"],
        {
            "severity": "Rất cao - Nguy hiểm bậc nhất cây có múi",
            "summary": "Nghi bệnh Vàng lá gân xanh (Citrus Greening/HLB do rầy chổng cánh truyền nhiễm).",
            "emergency": "Đào bỏ gốc và đốt tiêu hủy hoàn toàn cây đã phát bệnh nặng để bảo vệ toàn bộ vườn còn lại.",
            "biological": "Trồng xen ổi trong vườn cam bưởi để xua đuổi rầy chổng cánh, nuôi kiến vàng làm thiên địch tự nhiên.",
            "chemical": "Phun thuốc diệt rầy chổng cánh triệt để vào các đợt cây nhú đọt non bằng hoạt chất Thiamethoxam, Imidacloprid hoặc Buprofezin.",
            "prevention": "Chỉ mua cây giống sạch bệnh từ các trung tâm khuyến nông uy tín có chứng nhận sạch bệnh HLB.",
        },
    ),
    (
        ["vang la", "yellow leaf", "yellow"],
        {
            "severity": "Trung bình",
            "summary": "Nghi bệnh vàng lá (do thiếu vi lượng hoặc côn trùng chích hút truyền virus).",
            "emergency": "Kiểm tra mặt dưới lá tìm rầy/rệp chích hút. Cách ly cây vàng vọt khỏi các cây con.",
            "biological": "Bổ sung phân hữu cơ hoai mục kết hợp vi lượng Magiê (Mg), Sắt (Fe), Kẽm (Zn) để cây tái tạo chất diệp lục.",
            "chemical": "Nếu có côn trùng chích hút, phun thuốc trừ sâu sinh học dầu neem hoặc Emamectin benzoate.",
            "prevention": "Kiểm tra độ pH của đất (đạt chuẩn 5.5 - 6.5 để rễ hấp thu tốt vi lượng), bón vôi định kỳ đầu mùa mưa.",
        },
    ),
    (
        ["kham la", "mosaic virus", "mosaic", "xoan la", "xoan vang la", "curl virus", "yellowleaf curl", "virus"],
        {
            "severity": "Rất cao - Do Virus không có thuốc trị",
            "summary": "Nghi bệnh do virus (khảm loang lổ, xoăn đọt lá). Cây bị virus không thể chữa bằng thuốc hóa chất!",
            "emergency": "Nhổ bỏ cây bệnh ngay lập tức cho vào bao kín đem tiêu hủy để tránh bọ trĩ, rầy mềm hút nhựa lây sang cây khỏe.",
            "biological": "Treo bẫy dính màu vàng quanh ruộng/vườn để bắt bọ trĩ, bọ phấn trắng; phun dịch tỏi ớt xua đuổi côn trùng.",
            "chemical": "Phun thuốc diệt trừ triệt để môi giới truyền bệnh (bọ phấn trắng, rầy mềm) bằng Dinotefuran, Pymetrozine hoặc Spirotetramat.",
            "prevention": "Sử dụng giống sạch virus, che lưới chống côn trùng trong giai đoạn cây con.",
        },
    ),
    (
        ["nhen do", "nhen hai", "spider mites", "mite"],
        {
            "severity": "Trung bình",
            "summary": "Nghi do nhện đỏ hoặc nhện hại chích hút mặt dưới lá làm lá lấm tấm bạc màu và đóng màng tơ.",
            "emergency": "Dùng vòi nước áp lực phun xịt mạnh vào mặt dưới tán lá vào buổi trưa để cuốn trôi nhện và phá vỡ ổ tơ.",
            "biological": "Phun dầu khoáng nông nghiệp hoặc chế phẩm sinh học thảo mộc dầu neem hữu cơ.",
            "chemical": "Luân phiên thuốc đặc trị nhện đỏ để tránh kháng thuốc: Abamectin, Propargite, Fenpyroximate hoặc Diafenthiuron.",
            "prevention": "Tránh để vườn khô hạn thiếu ẩm kéo dài (nhện đỏ phát triển mạnh nhất trong thời tiết khô nóng).",
        },
    ),
    (
        ["rep hai", "rep", "aphid", "ruoi duc than", "stem fly"],
        {
            "severity": "Trung bình",
            "summary": "Nghi do rệp muội hoặc ruồi đục thân chích hút gây quăn queo đọt non và tiết mật thu hút nấm bồ hóng.",
            "emergency": "Cắt bỏ các ngọn chồi bị bám dày đặc ổ rệp đem vứt bỏ, dùng khăn ẩm lau sạch mặt lá.",
            "biological": "Treo bẫy dính vàng, phun nước xà phòng loãng (vài giọt nước rửa chén pha loãng) hoặc dung dịch tỏi gừng ớt.",
            "chemical": "Phun thuốc trừ rệp có hoạt chất Pymetrozine, Acetamiprid hoặc Clothianidin khi mật độ rệp cao.",
            "prevention": "Bảo vệ các loài thiên địch có ích trong vườn như bọ rùa, bọ ngựa, kiến ba khoang.",
        },
    ),
    (
        ["dom la", "dom nau", "dom den", "dom muc tieu", "dom vang ram", "tan spot", "chay mep la", "chay chop la", "bong la", "soi den", "spot", "septoria", "cercospora", "target spot", "scorch", "scald", "measles"],
        {
            "severity": "Trung bình",
            "summary": "Nghi bệnh đốm lá / cháy mép lá do các loại nấm ký sinh trên phiến lá.",
            "emergency": "Tỉa bớt lá bệnh và lá già sát gốc, quét dọn sạch lá rụng dưới mặt luống.",
            "biological": "Bón tăng cường phân Kali giúp mép lá cứng cáp, tưới gốc nấm đối kháng Trichoderma phòng ngừa tái phát.",
            "chemical": "Phun thuốc trừ nấm phổ rộng: Mancozeb, Difenoconazole (Score), Azoxystrobin hoặc Chlorothalonil.",
            "prevention": "Tưới nước thấm ở gốc, tuyệt đối không tưới phun mưa lúc chiều tối để lá không bị ướt qua đêm.",
        },
    ),
    (
        ["heo ru", "fussarium wilt", "fusarium wilt", "heo vang", "wilt"],
        {
            "severity": "Cao - Nấm đất xâm nhập rễ",
            "summary": "Nghi bệnh héo rũ do nấm Fusarium (lá héo rũ ban ngày, tươi lại ban đêm, mạch dẫn thân bị nâu đen).",
            "emergency": "Nhổ bỏ cây bệnh nặng kèm rễ, rắc vôi bột vào hố cây để khử trùng ổ nấm đất, không tưới tràn lan.",
            "biological": "Bón phân hữu cơ ủ hoai mục có bổ sung nấm Trichoderma định kỳ 15-20 ngày/lần để bảo vệ bộ rễ.",
            "chemical": "Tưới gốc các thuốc trừ nấm đất chuyên biệt: Hymexazol, Metalaxyl hoặc Fosetyl-aluminium.",
            "prevention": "Tuyệt đối không trồng liên tục các cây họ cà (cà chua, ớt, khoai tây) trên cùng một thửa đất quá 2 vụ.",
        },
    ),
    (
        ["than den", "bui than", "smut"],
        {
            "severity": "Cao - Gây hại bông hạt",
            "summary": "Nghi bệnh than đen (bông hoặc chồi biến dạng thành bọc phấn đen như than muội).",
            "emergency": "Dùng túi nilon bọc kín bông/chồi bị than đen trước khi cắt tỉa để tránh phát tán bào tử than đen ra xung quanh.",
            "biological": "Vệ sinh đồng ruộng, dọn sạch tàn dư rơm rạ sau vụ thu hoạch.",
            "chemical": "Xử lý hạt giống trước khi gieo bằng thuốc trừ nấm Carboxin hoặc Thiram.",
            "prevention": "Sử dụng giống sạch bệnh đã qua xử lý nhiệt hoặc hóa chất từ cơ sở giống tin cậy.",
        },
    ),
    (
        ["chay la", "bac bong", "head blight", "blight"],
        {
            "severity": "Cao - Gây hại lá và bông",
            "summary": "Nghi bệnh cháy lá / bạc bông do nấm ký sinh.",
            "emergency": "Cắt tỉa thu gom các bộ phận bị bệnh đem tiêu hủy xa khu canh tác.",
            "biological": "Giảm lượng phân bón đạm, cân đối bón Lân và Kali giúp cây tăng sức đề kháng tự nhiên.",
            "chemical": "Phun luân phiên thuốc trừ nấm: Tebuconazole, Carbendazim, Mancozeb hoặc Azoxystrobin.",
            "prevention": "Gieo trồng mật độ hợp lý, tránh gieo quá dày làm tán cây rậm rạp ẩm ướt.",
        },
    ),
    (
        ["ghe", "scab", "vay nen"],
        {
            "severity": "Trung bình",
            "summary": "Nghi bệnh ghẻ sẹo (Scab làm quả và lá nổi nốt sần sùi đóng vảy xám).",
            "emergency": "Cắt tỉa cành vô hiệu, cành tăm để ánh nắng chiếu xuyên vào tận bên trong thân cây.",
            "biological": "Dọn sạch lá rụng dưới gốc cây sau mỗi đợt mưa rào.",
            "chemical": "Phun phòng trừ nấm bằng Difenoconazole, Kresoxim-methyl hoặc Mancozeb khi cây đang ra đợt lá non.",
            "prevention": "Quét vôi gốc cây hàng năm để tiêu diệt mầm nấm trú đông dưới vỏ cây.",
        },
    ),
    (
        ["moc la", "moc", "leaf mold", "mold"],
        {
            "severity": "Trung bình",
            "summary": "Nghi bệnh mốc lá (thường xuất hiện ở môi trường nhà màng ẩm cao, mặt dưới lá có lớp mốc nhung).",
            "emergency": "Tăng cường quạt thông gió, mở mái nhà màng để giảm nhanh độ ẩm không khí xuống dưới 80%.",
            "biological": "Tỉa bỏ bớt lá già phía dưới để thông thoáng gốc, tưới nước bằng hệ thống nhỏ giọt.",
            "chemical": "Phun thuốc trừ nấm: Chlorothalonil, Copper Hydroxide hoặc Boscalid.",
            "prevention": "Duy trì mật độ cây trồng thưa thoáng, điều hòa nhiệt độ và độ ẩm trong nhà lưới ổn định.",
        },
    ),
]

DEFAULT_TREATMENT = {
    "severity": "Cần theo dõi",
    "summary": "Chưa có dữ liệu xử lý chi tiết cho loại bệnh này. Khuyến nghị cách ly cây nghi nhiễm và tham khảo cán bộ nông nghiệp.",
    "emergency": "Cách ly cây nghi nhiễm, cắt bỏ bộ phận bị héo úa hoặc đốm mục cho vào túi rác kín.",
    "biological": "Dọn cỏ rác quanh gốc, tưới nước vừa phải vào gốc vào buổi sáng sớm, tránh làm ướt sũng lá.",
    "chemical": "Có thể phun thuốc phòng trừ nấm phổ rộng gốc Đồng hoặc Mancozeb theo liều lượng trên bao bì.",
    "prevention": "Theo dõi tiến triển triệu chứng và mang mẫu lá đến trạm khuyến nông địa phương để kiểm tra kính hiển vi.",
}


def get_treatment_suggestion(disease_name: str) -> dict[str, str]:
    """Tra cuu phac do dieu tri theo cau truc 4 ngan chi tiet."""
    normalized = _normalize(disease_name)
    for keywords, data in STRUCTURED_TREATMENTS:
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", normalized):
                return data
    return DEFAULT_TREATMENT

