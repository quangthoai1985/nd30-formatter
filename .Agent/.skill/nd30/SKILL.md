---
name: nd30
description: >
  Soạn thảo, kiểm tra và chỉnh sửa văn bản hành chính Việt Nam theo đúng chuẩn
  Nghị định 30/2020/NĐ-CP (ND30) của Chính phủ. BẮT BUỘC sử dụng skill này
  bất cứ khi nào người dùng cần: tạo mới hoặc chỉnh sửa văn bản hành chính
  (quyết định, công văn, tờ trình, báo cáo, chỉ thị, thông báo, hướng dẫn,
  kế hoạch, biên bản, chương trình, giấy mời, v.v.), kiểm tra thể thức văn bản
  có đúng chuẩn ND30 không, review định dạng văn bản nhà nước, xuất file .docx
  cho văn bản hành chính, hoặc hỏi về quy định trình bày văn bản nhà nước
  Việt Nam. Luôn kích hoạt khi gặp các từ khoá: "văn bản hành chính",
  "thể thức văn bản", "NĐ30", "nghị định 30", "quốc hiệu", "tiêu ngữ",
  "nơi nhận", "số ký hiệu văn bản", "V/v", "kính gửi", "quyết định số",
  "công văn số", "tờ trình", "trích yếu", "TM.", "KT.", "TL.", "TUQ.",
  "lề trái 30mm", "Times New Roman", "font 13", "font 14",
  "soạn văn bản", "tạo văn bản", "mẫu văn bản", "biểu mẫu hành chính",
  "định dạng văn bản", "format văn bản". Luôn dùng skill này khi tạo file
  .docx cho các loại văn bản nhà nước, ngay cả khi người dùng không nói rõ
  "theo ND30" — bất kỳ văn bản hành chính Việt Nam nào cũng PHẢI tuân thủ ND30.
---

# Skill: Soạn thảo và Kiểm tra Văn bản Hành chính theo ND30

Skill này giúp **tạo mới**, **chỉnh sửa** hoặc **kiểm tra thể thức** văn bản
hành chính Việt Nam tuân thủ **Nghị định 30/2020/NĐ-CP** (Phụ lục I – Thể thức
và kỹ thuật trình bày văn bản hành chính).

---

## Bước 0 – Xác định yêu cầu

Trước khi làm bất cứ điều gì, hãy xác định:

1. **Loại nhiệm vụ**: Tạo mới / Chỉnh sửa / Kiểm tra thể thức
2. **Loại văn bản**: Quyết định, Công văn, Tờ trình, Báo cáo, Chỉ thị, Thông báo,
   Hướng dẫn, Kế hoạch, Biên bản, Chương trình, v.v.
3. **Đầu vào**: Người dùng cung cấp nội dung dạng text, file .docx cần sửa, hay
   chỉ mô tả yêu cầu?

Nếu thiếu thông tin quan trọng (tên cơ quan, số hiệu, ngày tháng, nội dung chính),
**hỏi ngắn gọn** trước khi bắt tay làm.

Nếu người dùng không cung cấp đủ thông tin để điền vào một trường bắt buộc,
dùng placeholder rõ ràng: `[TÊN CƠ QUAN]`, `[SỐ VĂN BẢN]`, `[NỘI DUNG]`, v.v.

---

## Bước 1 – Đọc tài liệu tham chiếu (BẮT BUỘC)

Trước khi tạo hoặc chỉnh sửa bất kỳ văn bản nào, **bắt buộc** đọc các file
tham chiếu trong thư mục `references/` của skill này:

- `references/formatting-rules.md` — Toàn bộ quy tắc định dạng chi tiết (font,
  cỡ chữ, kiểu chữ, lề, khoảng cách) cho từng thành phần thể thức
- `references/document-types.md` — Đặc điểm riêng từng loại văn bản, ký hiệu,
  cấu trúc nội dung mẫu
- `references/abbreviations.md` — Bảng chữ viết tắt chuẩn (tên loại VB, tên cơ
  quan, quyền hạn ký)
- `references/layout-diagram.md` — Sơ đồ bố trí 14 ô trên trang A4

Khi kiểm tra thể thức, đọc thêm:
- `references/checklist.md` — Checklist kiểm tra từng thành phần

---

## Bước 2 – Xử lý đầu vào

### 2a. Nếu người dùng cung cấp file .docx cần sửa/kiểm tra

1. Đọc file .docx bằng `python-docx` để trích xuất nội dung và định dạng
2. So sánh với quy tắc trong `references/formatting-rules.md`
3. Nếu là nhiệm vụ "kiểm tra" → chuyển sang Bước 3
4. Nếu là nhiệm vụ "chỉnh sửa" → xác định phần cần sửa → chuyển sang Bước 4

### 2b. Nếu người dùng cung cấp nội dung text hoặc mô tả yêu cầu

1. Xác định loại văn bản phù hợp
2. Thu thập thông tin: tên cơ quan, địa danh, ngày tháng, nội dung
3. Chuyển sang Bước 4

---

## Bước 3 – Kiểm tra thể thức (khi yêu cầu review)

Dùng checklist tại `references/checklist.md` để đánh giá **từng thành phần**.
Báo cáo kết quả theo cấu trúc:

```
## Kết quả kiểm tra thể thức ND30

### A. Thiết lập trang
✅ Khổ A4 (210×297 mm)
✅ Lề trái: 30 mm (đúng khoảng 30-35 mm)
❌ Lề phải: 25 mm → **Cần sửa**: giảm về 15-20 mm
⚠️ Phông chữ: Arial → **Cần sửa**: chuyển sang Times New Roman

### B. Quốc hiệu và Tiêu ngữ
✅ "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM": IN HOA, đậm, cỡ 13
❌ "Độc lập - Tự do - Hạnh phúc": đang in nghiêng → **Cần sửa**: chuyển
   về đứng, đậm (KHÔNG nghiêng theo ND30)

[... tiếp tục cho tất cả thành phần ...]

### Tổng kết
- ✅ Đạt: X/Y thành phần
- ❌ Cần sửa: Z thành phần
- ⚠️ Cần xem xét: W thành phần
```

---

## Bước 4 – Tạo / Chỉnh sửa văn bản

### 4a. Thiết lập trang (BẮT BUỘC cho mọi văn bản)

```python
from docx import Document
from docx.shared import Pt, Mm, RGBColor, Cm

doc = Document()
section = doc.sections[0]
section.page_width  = Mm(210)    # Khổ A4
section.page_height = Mm(297)
section.top_margin    = Mm(20)   # 20–25 mm → dùng 20
section.bottom_margin = Mm(20)   # 20–25 mm → dùng 20
section.left_margin   = Mm(30)   # 30–35 mm → dùng 30
section.right_margin  = Mm(15)   # 15–20 mm → dùng 15
```

### 4b. Font mặc định

Phông chữ **Times New Roman**, bộ mã Unicode (TCVN 6909:2001), màu đen cho
toàn bộ văn bản. Xem `references/formatting-rules.md` để biết cỡ chữ và kiểu
chữ cho từng thành phần cụ thể.

### 4c. Thứ tự trình bày các thành phần

Xem sơ đồ bố trí đầy đủ tại `references/layout-diagram.md`.
Thứ tự chuẩn từ trên xuống, trái sang phải:

| Ô | Vị trí | Thành phần |
|---|--------|-----------|
| 2 | Trái trên | Tên cơ quan chủ quản + cơ quan ban hành |
| 1 | Phải trên | Quốc hiệu và Tiêu ngữ |
| 3 | Trái (dưới ô 2) | Số, ký hiệu văn bản |
| 4 | Phải (dưới ô 1) | Địa danh và thời gian |
| 5a | Giữa | Tên loại + trích yếu (VB có tên loại) |
| 5b | Trái (dưới ô 3) | V/v trích yếu (chỉ Công văn) |
| 9a | Trái | Kính gửi (chỉ Công văn/Tờ trình/Báo cáo gửi cấp trên) |
| 6 | Giữa | Nội dung văn bản |
| 7a | Phải cuối | Quyền hạn, chức vụ người ký |
| 7b | Phải cuối | Họ tên người ký |
| 7c | Phải cuối | Chữ ký |
| 8 | Phải cuối | Dấu cơ quan |
| 9b | Trái cuối | Nơi nhận |

### 4d. Tạo văn bản bằng script

Dùng script tại `scripts/create_vbhc.py` để tạo khung văn bản. Script hỗ trợ:
- Tạo mới văn bản hoàn chỉnh theo loại
- Kiểm tra file .docx có đúng thể thức không

Cách sử dụng cơ bản:
```python
from scripts.create_vbhc import create_vbhc

create_vbhc(
    loai_vb='QD',                           # QD, CV, TB, TTr, BC, KH, CT, HD...
    co_quan_chu_quan='UBND TỈNH AN GIANG',
    co_quan_ban_hanh='SỞ GIÁO DỤC VÀ ĐÀO TẠO',
    so='05',
    ky_hieu='QĐ-SGD&ĐT',
    dia_danh='Long Xuyên',
    ngay='04', thang='4', nam='2026',
    ten_loai_vb='QUYẾT ĐỊNH',
    trich_yeu='Về việc ban hành quy chế làm việc',
    quyen_han_ky='TM. ỦY BAN NHÂN DÂN',
    chuc_vu='GIÁM ĐỐC',
    ho_ten='Nguyễn Văn A',
    noi_nhan=['UBND tỉnh (để báo cáo)', 'Các phòng, ban liên quan'],
    output_path='output.docx'
)
```

### 4e. Mẫu tham chiếu

Thư mục `assets/` chứa các file .docx mẫu đã được định dạng đúng chuẩn ND30:
- `assets/mau_quyet_dinh.docx` — Mẫu Quyết định
- `assets/mau_cong_van.docx` — Mẫu Công văn
- `assets/mau_to_trinh.docx` — Mẫu Tờ trình
- `assets/mau_bao_cao.docx` — Mẫu Báo cáo
- `assets/mau_thong_bao.docx` — Mẫu Thông báo
- `assets/mau_ke_hoach.docx` — Mẫu Kế hoạch

Khi tạo văn bản mới, có thể tham khảo file mẫu tương ứng để đảm bảo bố cục
chính xác.

---

## Bước 5 – Kiểm tra lại trước khi xuất

Trước khi giao file cho người dùng, tự kiểm tra nhanh theo checklist rút gọn:

- [ ] Font Times New Roman toàn bộ văn bản
- [ ] Định lề đúng: trái 30mm, phải 15mm, trên 20mm, dưới 20mm
- [ ] Quốc hiệu: IN HOA, đậm, đứng, cỡ 12–13
- [ ] Tiêu ngữ: in thường, đậm, **đứng** (KHÔNG nghiêng!), cỡ 13–14
- [ ] Đường kẻ dưới Tiêu ngữ: nét liền, dài bằng dòng chữ
- [ ] Tên cơ quan chủ quản: IN HOA, đứng, KHÔNG đậm, cỡ 12–13
- [ ] Tên cơ quan ban hành: IN HOA, đứng, đậm, cỡ 12–13
- [ ] Đường kẻ dưới tên cơ quan: nét liền, 1/3–1/2 dòng chữ
- [ ] Số ký hiệu đúng dạng: `Số: XX/YYY-ZZZ`
- [ ] Số < 10 có số 0 phía trước
- [ ] Địa danh + ngày tháng: nghiêng, cỡ 13–14
- [ ] Tên loại văn bản: IN HOA, đậm, đứng (nếu có)
- [ ] Trích yếu: in thường, đậm, đứng
- [ ] Nội dung: canh đều 2 lề (Justify), lùi đầu dòng 1cm, cỡ 13–14
- [ ] Khoảng cách đoạn ≥ 6pt, khoảng cách dòng: đơn đến 1.5 lines
- [ ] "Nơi nhận:": nghiêng, đậm, cỡ 12; danh sách: đứng, cỡ 11
- [ ] Quyền hạn ký (TM./KT./TL./TUQ./Q.): IN HOA, đậm, đứng
- [ ] Họ tên người ký: in thường, đậm, đứng, KHÔNG có học hàm/học vị

---

## Quy tắc vàng

> **Một văn bản ND30 đúng chuẩn = đúng thể thức + đúng nội dung + đúng
> thẩm quyền.**
> Skill này xử lý **thể thức**. Nội dung và thẩm quyền do người dùng chịu
> trách nhiệm.

> **Cỡ chữ phải thống nhất** trong toàn bộ văn bản. Nếu chọn Quốc hiệu cỡ 13
> thì Tiêu ngữ phải cỡ 14, địa danh cỡ 14. Nếu chọn Quốc hiệu cỡ 12 thì
> Tiêu ngữ cỡ 13, địa danh cỡ 13.

> **Tiêu ngữ "Độc lập - Tự do - Hạnh phúc" KHÔNG BAO GIỜ in nghiêng** — đây
> là lỗi phổ biến nhất. ND30 quy định rõ: kiểu chữ ĐỨNG, ĐẬM.
