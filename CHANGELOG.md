# CHANGELOG

## [2.0.0] — 2026-04-12

### Tổng quan
Phiên bản 2.0 thay thế toàn bộ pipeline OCR MinerU 2.5 Pro (4 endpoint bất đồng bộ) bằng **OpenRouter Vision API** — một endpoint duy nhất, hỗ trợ nhiều model AI, có thể chọn trực tiếp trên giao diện.

---

### Tính năng mới

#### OCR & Phân tích văn bản qua OpenRouter AI
- Thay thế 5 file endpoint MinerU (`mineru-upload`, `mineru-submit`, `mineru-status`, `mineru-download`, `extract-ai`) bằng một file duy nhất: `functions/api/ocr-openrouter.js`
- Hỗ trợ 2 chế độ trong cùng 1 endpoint:
  - **Vision mode** (`images`): PDF/ảnh → render từng trang sang base64 → gửi tất cả trang cùng lúc lên model vision
  - **Text mode** (`text`): DOCX/text nhập tay → gửi text lên model text (không cần vision, tiết kiệm chi phí)
- Chiến lược fallback: thử model theo danh sách ưu tiên, tự động chuyển sang model tiếp theo nếu gặp lỗi 429/503

#### Chọn Model AI ngay trên giao diện
- **Upload view (PDF/Ảnh)**: radio list chọn 1 model vision với hiển thị giá cụ thể
- **Upload view (DOCX) & Text view**: danh sách ưu tiên các model text free — có thể thêm/xóa model tùy ý
- Lưu lựa chọn vào `localStorage` — nhớ giữa các phiên
- Link nhanh đến trang danh sách model free trên OpenRouter

#### Danh sách model Vision (PDF/Ảnh)
| Model | Loại | Giá |
|---|---|---|
| Gemma 4 26B | Free | $0 |
| Gemma 4 31B | Free | $0 |
| Qwen 3.5 9B | Trả phí | $0.05/M |
| Gemini 3.1 Flash Lite | Trả phí | $0.25/M |
| Qwen 3.5 Plus | Trả phí | $0.26/M |
| Gemini 3 Flash | Trả phí | $0.50/M |
| Qwen 3.6 Plus | Trả phí | $0.80/M |

#### Danh sách model Text mặc định (DOCX/Text — Free)
- `nvidia/nemotron-nano-12b-v2-vl:free`
- `nvidia/nemotron-3-nano-30b-a3b:free`
- `google/gemma-4-26b-a4b-it:free`

#### Prompt AI cải tiến
- Áp dụng nguyên tắc "high-precision extraction" — không tóm tắt, không suy diễn, giữ nguyên 100% nội dung gốc
- System prompt bằng tiếng Anh (vision model xử lý instruction Anh chính xác hơn)
- Quy tắc phân loại dựa trên vị trí vật lý trên trang (góc trái/phải, giữa trang)
- Tách rõ `chuc_danh_ban_hanh` (dòng CHỦ TỊCH UBND... giữa trích yếu và căn cứ)

#### Template DOCX Quyết Định (`Template_QuyetDinh.docx`)
- Khôi phục cấu trúc XML đúng (2 bảng: header + footer ký tên)
- Thêm `{{chuc_danh_ban_hanh}}` (dòng chức danh ban hành, bold, căn giữa)
- Đổi `{{can_cu}}` sang paragraph loop `{{#can_cu_lines}}{{.}}{{/can_cu_lines}}` — mỗi căn cứ xuống dòng đúng với thụt đầu dòng
- Đổi `{{noi_dung_quyet_dinh}}` sang paragraph loop `{{#noi_dung_lines}}{{.}}{{/noi_dung_lines}}` — mỗi đoạn xuống dòng đúng với thụt đầu dòng và căn đều 2 bên

#### Form kiểm tra & chỉnh sửa
- Thêm trường **Chức danh ban hành** (giữa Trích yếu và Căn cứ)
- Sửa layout 2 block đầu (`form-row-2`) bằng `display: flex` — chiều cao các ô input đều nhau
- Đổi nhãn "OCR tiếng Việt (Tesseract)" → "AI nhận dạng văn bản (OpenRouter)"

#### Xử lý PDF cải tiến
- Render tất cả trang PDF thành ảnh base64 bằng `pdfjs-dist` trước khi gửi AI (tránh lỗi layout 2 cột)
- Clone `ArrayBuffer` trước khi truyền vào pdfjs để tránh lỗi "detached ArrayBuffer"

---

### Thay đổi kỹ thuật

#### Files mới
- `functions/api/ocr-openrouter.js` — endpoint OCR + bóc tách field qua OpenRouter

#### Files bị xóa
- `functions/api/mineru-upload.js`
- `functions/api/mineru-submit.js`
- `functions/api/mineru-status.js`
- `functions/api/mineru-download.js`
- `functions/api/extract-ai.js`

#### Files chỉnh sửa chính
- `src/main.js` — thêm `tryBackendOCR()`, `tryTextAI()`, model preference system, model panel UI
- `src/nd30-docx.js` — thêm `formatTrichYeu()`, `can_cu_lines`, `noi_dung_lines`, `chuc_danh_ban_hanh`
- `src/style.css` — thêm `.model-panel`, `.model-radio-*`, `.model-priority-*`, fix `.form-row-2`
- `index.html` — thêm model panel HTML cho upload view và text view
- `wrangler.jsonc` / `wrangler.toml` — cập nhật secret từ `MISTRAL_API_KEY` → `OPENROUTER_API_KEY`

#### Biến môi trường
- Xóa: `MINERU_API_KEY`, `MISTRAL_API_KEY`
- Thêm: `OPENROUTER_API_KEY`

---

## [1.x] — Trước 2026-04-12
- Pipeline MinerU 2.5 Pro (4 endpoint bất đồng bộ)
- OCR bằng Tesseract.js (client-side)
- Bóc tách field bằng Mistral AI
