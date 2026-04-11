# Kế hoạch & Kiến trúc hệ thống: Web App Chuẩn hóa Văn bản Hành chính ND30

Tài liệu này phản ánh kiến trúc **thực tế** của dự án hiện hành và định hướng nâng cấp (đặc biệt là quy trình OCR và xuất file DOCX).

## 1. Kiến trúc thực tế hiện hành (Current Workflow)
Khác với bản nháp ban đầu dự định dùng kiến trúc Hybrid Cloudflare + Storage Queue phức tạp, dự án hiện tại đang được triển khai theo mô hình **100% Client-Side (Trình duyệt xử lý toàn bộ)**.

### Quy trình hiện tại đang chạy trong code (`src/`):
1. **Frontend:** React/Vanilla JS chạy qua Vite. Người dùng upload file.
2. **Tiền xử lý PDF/Image:** Dùng thư viện `pdfjs-dist` (chạy client-side) để render các trang PDF thành HTML Canvas.
3. **Core OCR (Nhận diện chữ):** Đang sử dụng **`tesseract.js`** chạy trực tiếp bằng Web Worker trên trình duyệt người dùng.
4. **Phân tích Semantic (Bóc tách trường dữ liệu):** Hoàn toàn dùng **Rule-based (Regex/Logic)** thông qua các file `parsers.js` và `rule-parser.js`. Không gọi API AI từ bên ngoài.
5. **Xuất file DOCX:** 
   - **HIỆN TẠI KHÔNG DÙNG TEMPLATE .DOCX CÓ SẴN VÀ CŨNG KHÔNG DÙNG `docxtemplater`.**
   - Đang dựng cấu trúc file Word **hoàn toàn bằng code** thông qua thư viện npm **`docx`** (file `nd30-docx.js`). Hệ thống tự định nghĩa Paragraph, Table, canh lề 30-15-20-20mm, sau đó Export sang Blob và tải về qua `file-saver`. Mọi "vị trí" và "table" đều được vẽ bằng code thuần chứ không map vào tag của bất kỳ form trống nào.

---

## 2. Điểm hạn chế của Workflow hiện tại
- **OCR Tesseract.js trên Client:** Rất nặng máy người dùng, ăn nhiều RAM, tốc độ nhận diện quá chậm với văn bản nhiều trang, và chất lượng OCR tiếng Việt, dàn trang bóc tách (Bảng biểu, Layout 2 cột Quốc hiệu - Tiêu ngữ) **rất kém**.
- **Xuất DOCX bằng code thuần:** Rất cực để bảo trì. Mỗi khi cần đổi vị trí, căn lề hay thêm loại văn bản mới (như Giấy mời, Tờ trình), lập trình viên phải lập trình lại tọa độ, bảng (Table).

---

## 3. Định hướng nâng cấp: Chuyển đổi sang MinerU 2.5 Pro & Template DOCX

Để đáp ứng được cấp độ Production, kiến trúc cần dịch chuyển sang dạng Client-Server cho bước phân tích nặng.

### A. Nâng cấp OCR Engine -> MinerU 2.5 Pro
- **Loại bỏ `tesseract.js`** khỏi mã nguồn Frontend vì không đủ năng lực xử lý Layout phức tạp.
- **Tích hợp API MinerU 2.5 Pro (External Service):**
  - MinerU 2.5 Pro là một mô hình SOTA chuyên dụng cho Document Parsing (OmniDocBench). Nó sẽ phân tích File PDF/Ảnh và nhả ra định dạng **Markdown hoặc JSON** sạch, không bị vỡ bảng hay sai thứ tự cột.
  - Sẽ xây dựng/triển khai một External Server (chạy FastAPI + GPU) host model MinerU này.
  - Khi User Upload file lên Web, Frontend (hoặc Cloudflare Worker) gửi File qua API đến Server MinerU -> Server trả về kết quả Markdown -> Client dùng dữ liệu này chạy qua Rule Parser.

### B. Nâng cấp bộ Render DOCX -> Dùng Template (.docx) với `docxtemplater`
Dựa trên nhu cầu thực tế và để quản lý form mẫu dễ dàng hơn thay vì Hard-code thư viện `docx`:
- Tạo sẵn nhiều file Word chuẩn nghị định (.docx template): `CongVan.docx`, `QuyetDinh.docx`, `ToTrinh.docx`. Trong file này, chuyên viên Văn thư đã canh lề sẵn (L30, R15, T20, B20), đặt sẵn font Times New Roman, và chỉ để lại các thẻ như `{{quoc_hieu}}`, `{{so_ky_hieu}}`, `{{noi_dung}}`.
- Xóa bỏ việc vẽ Table/Paragraph thủ công bằng `docx`.
- Dùng thư viện **`docxtemplater`** chạy ngay tại trình duyệt (hoặc trên Worker) để map cục JSON kết quả OCR/Form vào Template này. Đây là hướng đi thông minh giúp decouple hoàn toàn UI Rendering và Dữ liệu.

## 4. Tóm tắt sơ đồ hệ thống MỚI

1. **Upload File:** User upload File Ảnh/PDF trên giao diện Web Vite.
2. **External Data Extraction:**
   - Web gọi POST File đến Server API **MinerU 2.5 Pro**.
   - Trả về Markdown Text / JSON.
3. **Data Classification (Semantic):** Khối `rule-parser.js` trên frontend lọc Markdown để lấy ra `co_quan_ban_hanh`, `ngay_thang`, `noi_dung_chinh`... hiển thị lên Form Review cho User xem.
4. **Export:** User nhấn "Tải File Word".
   - Browser load file `template-qđ.docx` tĩnh từ assets.
   - Thư viện `docxtemplater` bind Data vào file DOCX.
   - Trình duyệt bật prompt Save File (`file-saver`).

*Ghi chú: Lớp Cloudflare Workers hoàn toàn có thể đứng làm Proxy/Bảo mật chèn giữa quá trình Frontend gọi Server API MinerU để chống spam và xác thực, đóng vai trò API Gateway gọn nhẹ.*
