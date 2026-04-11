const WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Mã loại văn bản hợp lệ
const VALID_LOAI = new Set(['QD', 'NQ', 'TB', 'TTR', 'BC', 'KH', 'CT', 'HD', 'BB', 'CV']);

export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return new Response(JSON.stringify({ success: false, error: 'Workers AI (env.AI) chưa được cấu hình' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { textMarkdown } = await request.json();

    if (!textMarkdown || textMarkdown.trim().length < 10) {
      return new Response(JSON.stringify({ success: false, error: 'Nội dung plain text quá ngắn hoặc trống' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Semantic extraction trên plain text
    const textSnippet = textMarkdown.substring(0, 7000); // Llama model context limit safe margin

    const systemPrompt =
      'Bạn là chuyên gia phân tích văn bản hành chính Việt Nam theo Nghị định 30/2020/NĐ-CP. ' +
      'Luôn trả về JSON hợp lệ, không có text nào khác ngoài JSON.';

    const userPrompt = `Phân tích văn bản sau. Trả về JSON với đúng các trường (để chuỗi rỗng nếu không tìm thấy, không bịa đặt):

{
  "loai_van_ban": "mã: QD | NQ | TB | TTR | BC | KH | CT | HD | BB | CV",
  "ten_loai_vb": "tên loại đầy đủ VIẾT HOA, ví dụ: QUYẾT ĐỊNH",
  "co_quan_chu_quan": "cơ quan chủ quản (dòng trên cơ quan ban hành, phía trái trang)",
  "co_quan_ban_hanh": "cơ quan ban hành văn bản (in đậm hơn, phía trái trang)",
  "so": "số văn bản — chỉ phần số nguyên, không kèm ký hiệu",
  "ky_hieu": "ký hiệu — phần sau dấu /, ví dụ: QĐ-UBND",
  "dia_danh": "địa danh trong dòng ngày tháng, ví dụ: An Giang",
  "ngay": "ngày 2 chữ số, ví dụ: 05",
  "thang": "tháng 2 chữ số, ví dụ: 04",
  "nam": "năm 4 chữ số, ví dụ: 2026",
  "trich_yeu": "nội dung sau V/v hoặc Về việc (không gồm V/v)",
  "can_cu": ["mỗi căn cứ ban hành là 1 string, không kèm dấu chấm phẩy cuối"],
  "kinh_gui": ["mỗi đơn vị kính gửi là 1 string"],
  "quyen_han_ky": "ví dụ: TM. ỦY BAN NHÂN DÂN hoặc KT. CHỦ TỊCH",
  "chuc_vu_ky": "ví dụ: PHÓ CHỦ TỊCH",
  "ho_ten_ky": "họ và tên người ký, ví dụ: Nguyễn Văn A",
  "noi_nhan": ["mỗi nơi nhận là 1 string"]
}

Văn bản:
${textSnippet}`;

    const aiResult = await env.AI.run(WORKERS_AI_MODEL, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: 2048,
    });

    const raw = aiResult?.response ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    
    let extracted = null;
    if (match) {
      extracted = normalizeExtracted(JSON.parse(match[0]));
    }

    return new Response(JSON.stringify({ success: true, extracted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[/api/extract-ai]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─────────────────────────────────────────────
// Normalize JSON từ Workers AI
// ─────────────────────────────────────────────

function normalizeExtracted(data) {
  const d = { ...data };

  for (const key of ['can_cu', 'kinh_gui', 'noi_nhan']) {
    if (!Array.isArray(d[key])) {
      d[key] = d[key] ? String(d[key]).split(/[;\n]/).map(s => s.trim()).filter(Boolean) : [];
    }
    d[key] = d[key].filter(s => typeof s === 'string' && s.trim().length > 0);
  }

  if (d.loai_van_ban) {
    const upper = d.loai_van_ban.trim().toUpperCase();
    d.loai_van_ban = VALID_LOAI.has(upper) ? upper : inferLoai(upper);
  }

  if (d.ten_loai_vb) d.ten_loai_vb = d.ten_loai_vb.trim().toUpperCase();
  if (d.co_quan_ban_hanh) d.co_quan_ban_hanh = d.co_quan_ban_hanh.trim().toUpperCase();
  if (d.co_quan_chu_quan) d.co_quan_chu_quan = d.co_quan_chu_quan.trim().toUpperCase();

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

  if (d.quyen_han_ky) d.quyen_han_ky = d.quyen_han_ky.trim().toUpperCase();
  if (d.chuc_vu_ky) d.chuc_vu_ky = d.chuc_vu_ky.trim().toUpperCase();

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
