/**
 * /api/ocr-openrouter — OCR + bóc tách văn bản hành chính ND30 qua OpenRouter Vision API
 * Thay thế toàn bộ flow MinerU (4 endpoint) bằng 1 endpoint duy nhất.
 * Chiến lược: thử model free trước → fallback model trả phí rẻ nếu lỗi 429/503.
 */

// Model có vision (dùng cho PDF/ảnh)
// Đa dạng nhà cung cấp: Qwen, ByteDance, Google, NVIDIA — tránh block region
const VISION_MODELS = [
  'qwen/qwen3.5-9b',                          // $0.05/M, vision, Qwen
  'bytedance-seed/seed-1.6-flash',             // $0.075/M, vision, ByteDance
  'google/gemini-3.1-flash-lite-preview',      // $0.25/M, vision, Google
  'google/gemini-3-flash-preview',             // $0.50/M, vision, Google
  'nvidia/nemotron-3-super-120b-a12b:free',    // Free, vision, NVIDIA
  'google/gemma-4-31b-it:free',                // Free, vision, Google
];

// Model text (dùng cho DOCX và text nhập tay)
const TEXT_MODELS = [
  'qwen/qwen3.5-9b',                          // $0.05/M, Qwen
  'bytedance-seed/seed-1.6-flash',             // $0.075/M, ByteDance
  'google/gemini-3.1-flash-lite-preview',      // $0.25/M, Google
  'google/gemini-3-flash-preview',             // $0.50/M, Google
  'nvidia/nemotron-3-super-120b-a12b:free',    // Free, NVIDIA
  'google/gemma-4-31b-it:free',                // Free, Google
];

const VALID_LOAI = new Set([
  // NĐ30
  'QD', 'NQ', 'TB', 'TTR', 'BC', 'KH', 'CT', 'HD', 'BB', 'CV', 'GM', 'GGT', 'GNP',
  // HD36 (prefix D_)
  'D_NQ', 'D_CT', 'D_KL', 'D_QD', 'D_QDI', 'D_QC', 'D_BC', 'D_TTR', 'D_TB',
  'D_HD', 'D_CTR', 'D_TT', 'D_CV', 'D_BB',
]);

const SYSTEM_PROMPT =
  'You are a high-precision Vietnamese document structure extraction AI.\n' +
  'You handle BOTH administrative documents (NĐ30) and Communist Party documents (HD36).\n' +
  'Your ONLY task is to analyze the provided document and extract structured data into JSON.\n' +
  'CRITICAL: Output MUST be valid JSON only. No explanations. No markdown. No text outside JSON.';

const USER_PROMPT = `Phân tích văn bản Việt Nam này và trích xuất CHÍNH XÁC vào JSON.

PHÂN BIỆT 2 LOẠI VĂN BẢN:
A) VĂN BẢN HÀNH CHÍNH (NĐ30): Có "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" + "Độc lập - Tự do - Hạnh phúc" ở góc phải. Số ký hiệu dạng "Số: 15/QĐ-UBND". Quyền hạn ký: TM., KT., TL.
   → loai_van_ban = "QD|NQ|TB|TTR|BC|KH|CT|HD|BB|CV"

B) VĂN BẢN ĐẢNG (HD36): Có "ĐẢNG CỘNG SẢN VIỆT NAM" ở góc phải. Dấu sao (*) dưới tên CQ. Số ký hiệu dạng "Số 15-NQ/HU". Quyền hạn ký: T/M, K/T, T/L (gạch chéo).
   → loai_van_ban = "D_QD|D_NQ|D_CT|D_KL|D_QDI|D_QC|D_BC|D_TTR|D_TB|D_HD|D_CTR|D_TT|D_CV|D_BB"

QUY TẮC BẮT BUỘC:
1. KHÔNG tóm tắt, KHÔNG giải thích, KHÔNG thêm text nào ngoài JSON.
2. Giữ nguyên 100% nội dung gốc — KHÔNG sửa chính tả, KHÔNG dịch, KHÔNG viết lại.
3. Trường nào không tìm thấy → để chuỗi rỗng "" hoặc mảng rỗng [].
4. KHÔNG bịa đặt nội dung không có trong ảnh.

QUY TẮC PHÂN LOẠI VỊ TRÍ:
- Góc trái trên: cơ quan chủ quản / cấp trên (dòng trên) + cơ quan ban hành (dòng dưới, đậm hơn)
- Góc phải trên: Quốc hiệu (NĐ30) HOẶC "ĐẢNG CỘNG SẢN VIỆT NAM" (HD36)
- Dòng "Số:..." hoặc "Số ..." → tách phần số và ký hiệu
- Dòng "..., ngày ... tháng ... năm ..." → tách địa danh, ngày, tháng, năm
- Dòng IN HOA ở giữa trang → tên loại văn bản
- Dòng sau tên loại (có "Về việc" hoặc "V/v" hoặc dòng thường) → trích yếu
- Dòng IN HOA giữa trích yếu và "Căn cứ" (NĐ30: CHỦ TỊCH UBND...) → chức danh ban hành
- "Căn cứ..." → mảng căn cứ
- "Kính gửi:" → mảng kính gửi
- Nội dung chính → giữ nguyên xuống dòng
- Khối ký: quyền hạn (TM./KT. hoặc T/M/K/T), chức vụ, họ tên
- "Nơi nhận:" → mảng nơi nhận

TRẢ VỀ ĐÚNG CẤU TRÚC JSON SAU:

{
  "loai_van_ban": "QD|NQ|...|D_NQ|D_CT|...",
  "ten_loai_vb": "QUYẾT ĐỊNH",
  "co_quan_chu_quan": "",
  "co_quan_ban_hanh": "",
  "so": "",
  "ky_hieu": "",
  "so_ky_hieu": "",
  "dia_danh": "",
  "ngay": "",
  "thang": "",
  "nam": "",
  "trich_yeu": "",
  "chuc_danh_ban_hanh": "",
  "can_cu": [],
  "kinh_gui": [],
  "noi_dung_text": "",
  "quyen_han_ky": "",
  "chuc_vu_ky": "",
  "ho_ten_ky": "",
  "noi_nhan": []
}`;

export async function onRequestPost({ request, env }) {
  if (!env.OPENROUTER_API_KEY) {
    return jsonResponse({ success: false, error: 'Chưa cấu hình OPENROUTER_API_KEY' }, 500);
  }

  try {
    const body = await request.json();
    const { images, text } = body;

    // Xác định mode: vision (PDF/ảnh) hoặc text (DOCX/nhập tay)
    const isTextMode = !images && typeof text === 'string' && text.trim().length > 0;

    if (!isTextMode && (!images || !Array.isArray(images) || images.length === 0)) {
      return jsonResponse({ success: false, error: 'Thiếu images (base64) hoặc text' }, 400);
    }

    // Tạo content array tùy mode
    let content;
    if (isTextMode) {
      content = [{ type: 'text', text: `${USER_PROMPT}\n\nVĂN BẢN CẦN PHÂN TÍCH:\n\n${text.trim()}` }];
    } else {
      content = [
        { type: 'text', text: USER_PROMPT },
        ...images.map(img => ({
          type: 'image_url',
          image_url: { url: img.startsWith('data:') ? img : `data:image/png;base64,${img}` }
        }))
      ];
    }

    // Dùng model list từ frontend nếu có, fallback về default
    let modelList;
    if (Array.isArray(body.modelList) && body.modelList.length > 0) {
      // Frontend gửi danh sách ưu tiên (dùng cho cả vision và text)
      modelList = body.modelList;
    } else if (isTextMode) {
      modelList = TEXT_MODELS;
    } else {
      modelList = VISION_MODELS;
    }

    // Thử lần lượt từng model
    let lastError = null;
    for (const model of modelList) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nd30.pages.dev',
            'X-Title': 'ND30 Formatter',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content }
            ],
            max_tokens: 4096,
            temperature: 0.1,
          })
        });

        // Model lỗi → log rõ ràng và thử model tiếp theo
        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429 || response.status === 503) {
            lastError = `Model ${model} quá tải (${response.status})`;
          } else if (response.status === 403) {
            lastError = `Model ${model} không khả dụng tại region này`;
          } else if (response.status === 404) {
            lastError = `Model ${model} không tồn tại`;
          } else {
            lastError = `Model ${model} lỗi ${response.status}: ${errText.substring(0, 200)}`;
          }
          console.log(`[ocr-openrouter] Skip: ${lastError}`);
          continue;
        }

        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content ?? '';

        // Trích xuất JSON từ response (xử lý cả markdown ```json ... ``` wrapper)
        let jsonStr = raw;
        // Bóc markdown code block nếu có
        const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }
        // Tìm JSON object
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          lastError = `Model ${model} không trả về JSON hợp lệ. Raw: ${raw.substring(0, 200)}`;
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
          lastError = `Model ${model} JSON parse lỗi: ${parseErr.message}. Raw: ${raw.substring(0, 200)}`;
          continue;
        }

        const extracted = normalizeExtracted(parsed);

        return jsonResponse({
          success: true,
          extracted,
          model_used: model,
        });

      } catch (modelErr) {
        lastError = `Model ${model}: ${modelErr.message}`;
        continue;
      }
    }

    // Tất cả model đều thất bại
    return jsonResponse({
      success: false,
      error: `Tất cả model đều thất bại. Lỗi cuối: ${lastError}`,
    }, 502);

  } catch (err) {
    console.error('[/api/ocr-openrouter]', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizeExtracted(data) {
  const d = { ...data };

  // Normalize arrays
  for (const key of ['can_cu', 'kinh_gui', 'noi_nhan']) {
    if (!Array.isArray(d[key])) {
      d[key] = d[key] ? String(d[key]).split(/[;\n]/).map(s => s.trim()).filter(Boolean) : [];
    }
    d[key] = d[key].filter(s => typeof s === 'string' && s.trim().length > 0);
  }

  // Normalize loại văn bản
  if (d.loai_van_ban) {
    const upper = d.loai_van_ban.trim().toUpperCase();
    d.loai_van_ban = VALID_LOAI.has(upper) ? upper : inferLoai(upper);
  }

  // Uppercase fields
  if (d.ten_loai_vb) d.ten_loai_vb = d.ten_loai_vb.trim().toUpperCase();
  if (d.co_quan_ban_hanh) d.co_quan_ban_hanh = d.co_quan_ban_hanh.trim().toUpperCase();
  if (d.co_quan_chu_quan) d.co_quan_chu_quan = d.co_quan_chu_quan.trim().toUpperCase();
  if (d.quyen_han_ky) d.quyen_han_ky = d.quyen_han_ky.trim().toUpperCase();
  if (d.chuc_vu_ky) d.chuc_vu_ky = d.chuc_vu_ky.trim().toUpperCase();

  // Normalize date
  if (d.ngay) {
    const n = parseInt(d.ngay, 10);
    d.ngay = isNaN(n) ? '' : String(n).padStart(2, '0');
  }
  if (d.thang) {
    const n = parseInt(d.thang, 10);
    d.thang = isNaN(n) ? '' : String(n).padStart(2, '0');
  }
  if (d.nam) {
    const n = parseInt(d.nam, 10);
    d.nam = isNaN(n) || n < 1990 || n > 2100 ? '' : String(n);
  }

  // Normalize số + ký hiệu
  if (d.so) {
    const m = String(d.so).match(/\d+/);
    d.so = m ? m[0] : '';
  }
  if (d.ky_hieu) {
    const parts = d.ky_hieu.split('/');
    if (parts.length > 1 && /^\d+$/.test(parts[0].trim())) {
      d.ky_hieu = parts.slice(1).join('/').trim();
      if (!d.so) d.so = parts[0].trim();
    }
    d.ky_hieu = d.ky_hieu.trim().toUpperCase();
  }

  // Xóa null/undefined
  for (const key of Object.keys(d)) {
    if (d[key] === null || d[key] === undefined) delete d[key];
  }

  return d;
}

function inferLoai(str) {
  if (/QUYẾT\s*ĐỊNH/.test(str)) return 'QD';
  if (/NGHỊ\s*QUYẾT/.test(str)) return 'NQ';
  if (/THÔNG\s*BÁO/.test(str)) return 'TB';
  if (/TỜ\s*TRÌNH/.test(str)) return 'TTR';
  if (/BÁO\s*CÁO/.test(str)) return 'BC';
  if (/KẾ\s*HOẠCH/.test(str)) return 'KH';
  if (/CHỈ\s*THỊ/.test(str)) return 'CT';
  if (/HƯỚNG\s*DẪN/.test(str)) return 'HD';
  if (/BIÊN\s*BẢN/.test(str)) return 'BB';
  if (/CÔNG\s*VĂN/.test(str)) return 'CV';
  return '';
}
