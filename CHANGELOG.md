# CHANGELOG

## [2.2.0] — 2026-04-13

### Tổng quan
Nâng cấp trải nghiệm người dùng với tính năng tìm kiếm model thông minh và thiết kế lại hoàn toàn giao diện biểu mẫu "Kiểm tra & Chỉnh sửa" theo phong cách thẻ (Card-based), đồng thời tối ưu hóa logic ẩn/hiện các trường thông tin theo từng loại văn bản.

---

### Tính năng mới & Cải tiến

#### Tìm kiếm Model thông minh (Tích hợp Select & Search)
- Tích hợp tính năng SelectBox nâng cao: Combobox thay thế hoàn toàn giao diện Select native nhàm chán bằng giải pháp 2 trong 1. Vừa hiển thị danh sách models gọn gàng, vừa cho phép gõ trực tiếp tên model để tìm kiếm trong thẻ Dropdown. Tính năng được tích hợp trực tiếp không dùng thư viện ngoài nào (100% Vanilla JS).

#### Thiết kế lại Form "Kiểm tra & Chỉnh sửa"
- **Giao diện dạng Thẻ (Card Layout)**: Phân chia biểu mẫu thành 5 mảng logic (Phân loại, Thể thức đầu trang, Trích yếu & Mở đầu, Nội dung chính, Ký tên & Nơi nhận) giúp thông tin minh bạch, dễ quản lý.
- **Tối ưu hóa Grid**: Chuyển đổi các lưới 6 cột chật chội sang lưới 2 hoặc 3 cột thông thoáng, đảm bảo hiển thị đẹp trên mọi kích thước màn hình laptop.
- **Khoảng cách & Trực quan**: Tăng cường padding và khoảng cách giữa các phần tử để giảm bớt sự choáng ngợp khi thao tác với văn bản dài.

#### Sửa lỗi & Tối ưu hóa PDF (Core)
- **Sửa lỗi JPEG2000 (JPX)**: Cấu hình đầy đủ WASM, CMap và Standard Fonts cho PDF.js, giải quyết triệt để lỗi không hiển thị hình ảnh nén JPEG2000 trong file PDF.
- **Tăng cường chất lượng OCR**: Nâng tỷ lệ render từ 2x lên 3x (~216 DPI), đảm bảo độ sắc nét cao nhất cho AI nhận diện văn bản.
- **Tối ưu dung lượng**: Chuyển đổi định dạng ảnh tạm thời từ PNG sang JPEG (quality 0.92), giúp giảm dung lượng bộ nhớ từ 3-5 lần mà vẫn giữ nguyên hiệu quả nhận dạng.
- **Xử lý Alpha Channel**: Tự động chèn nền trắng khi render canvas, tránh hiện tượng nền bị đen trên một số file PDF đặc thù.

#### Logic Thể thức Văn bản (NĐ30/HD36)
- **Thông minh hóa trường Chức danh ban hành**: Tự động ẩn/hiện mục "Chức danh ban hành" chuẩn xác theo từng loại văn bản (Hiện với Quyết định/Nghị quyết, ẩn với Công văn/Tờ trình/Báo cáo).
- **Cập nhật Schema**: Bổ sung cờ điều hướng hiển thị `showChucDanhBanHanh` cho toàn bộ hệ thống schema hành chính và Đảng.

---

### Thay đổi kỹ thuật

#### Frontend
- `index.html`: Tái cấu trúc hoàn toàn thẻ `<form id="review-form">` sang hệ thống Card UI.
- `src/main.js`:
  - Thêm logic lọc model trong `renderModelPriorityList()`.
  - Cập nhật hàm `applyDocSchema()` để điều khiển ẩn/hiện `#section-chuc-danh-ban-hanh`.
- `src/doc-schemas.js` & `src/hd36-schemas.js`: Cập nhật cấu trúc điều hướng cho các loại văn bản đặc thù.

---

## [2.1.0] — 2026-04-13

### Tổng quan
Nâng cấp toàn diện hệ thống quản lý model AI: hỗ trợ giá live từ OpenRouter, tối ưu hóa giao diện chọn model và loại bỏ hoàn toàn các bộ engine fallback cũ (Tesseract.js, Rule-based) để tập trung vào độ chính xác của AI.

---

### Tính năng mới & Cải tiến

#### Hệ thống Model Live Pricing
- API `/api/models` hiện trả về đầy đủ danh sách model từ OpenRouter với giá live (prompt/completion price).
- Tự động hiển thị giá trực tiếp trên giao diện chọn model để người dùng dễ dàng cân bằng giữa chi phí và chất lượng.
- Cache danh sách model thông minh, tự động refresh khi có thay đổi từ server.

#### Loại bỏ Fallback Engine cũ
- Gỡ bỏ hoàn toàn **Tesseract.js** (OCR dự phòng cho PDF/Ảnh) và **Rule-based Parser** (Phân tích dự phòng cho Text).
- Lý do: Các model AI hiện tại đã cực kỳ ổn định và chính xác. Việc duy trì các engine cũ gây nặng ứng dụng và có thể trả về kết quả sai lệch so với chuẩn AI.
- Hệ thống giờ đây sẽ thông báo lỗi rõ ràng nếu AI không phản hồi, yêu cầu người dùng kiểm tra kết nối hoặc đổi model thay vì trả về kết quả kém chất lượng từ engine cũ.

#### Tối ưu hóa UI/UX
- Giao diện chọn model (Model Panel) được làm lại, hiển thị thông tin rõ ràng hơn bao gồm giá và loại model.
- Tự động ưu tiên danh sách model tốt nhất dựa trên hiệu suất thực tế thay vì chỉ ưu tiên model Free.

---

### Thay đổi kỹ thuật

#### Cấu trúc Code
- `src/main.js`:
  - Thay thế `fetchFreeModels` bằng `fetchModels`.
  - Loại bỏ logic xử lý fallback trong `processFile()` và `processText()`.
  - Cải tiến `showUploadModelPanel()` và `renderModelPriorityList()` để hỗ trợ dữ liệu metadata đầy đủ của model.
- `functions/api/models.js`: Chỉnh sửa endpoint để lấy dữ liệu toàn diện hơn từ OpenRouter.

#### Xử lý lỗi
- Cải thiện luồng try/catch: Hiển thị thông báo lỗi chi tiết qua Toast khi model AI gặp sự cố.
- Yêu cầu phản hồi AI bắt buộc cho mọi luồng xử lý văn bản.

---

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
