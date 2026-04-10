/**
 * Cloudflare Pages Function — /api/process
 * Nhận text/file → gọi Gemini → trả JSON
 * CPU time: ~2-5ms (chỉ làm I/O, không parse file)
 */

// Gemini API base URL (model is read from env at runtime)
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// System prompt cho phân tích văn bản hành chính
const ND30_SYSTEM_PROMPT = `
Bạn là chuyên gia văn thư hành chính Việt Nam, chuyên về Nghị định 30/2020/NĐ-CP.

NHIỆM VỤ: Phân tích văn bản hành chính và trích xuất các thành phần thể thức thành JSON có cấu trúc chặt chẽ.

QUY TẮC:
1. Xác định ĐÚNG loại văn bản: QD (Quyết định), CV (Công văn), TB (Thông báo), TTr (Tờ trình), BC (Báo cáo), KH (Kế hoạch), CT (Chỉ thị), HD (Hướng dẫn), NQ (Nghị quyết), BB (Biên bản).
2. Tách biệt rõ ràng từng thành phần thể thức.
3. Nội dung chia thành mảng các phần tử (điều, khoản, điểm, đoạn văn).
4. Nếu không xác định được thành phần nào, để giá trị rỗng "".
5. Số < 10 phải có số 0 phía trước (vd: "05", "03").
6. CHỈ trả về JSON thuần túy, KHÔNG markdown, KHÔNG giải thích, KHÔNG bọc trong code block.

SCHEMA JSON BẮT BUỘC:
{
  "loai_van_ban": "QD|CV|TB|TTr|BC|KH|CT|HD|NQ|BB",
  "co_quan_chu_quan": "string hoặc rỗng",
  "co_quan_ban_hanh": "string",
  "so": "string (vd: '05')",
  "ky_hieu": "string (vd: 'QĐ-UBND')",
  "dia_danh": "string",
  "ngay": "string", "thang": "string", "nam": "string",
  "ten_loai_vb": "string (IN HOA, vd: 'QUYẾT ĐỊNH')",
  "trich_yeu": "string",
  "can_cu": ["string"],
  "kinh_gui": ["string"],
  "noi_dung": [
    { "type": "dieu|khoan|diem|muc_lon|doan", "so": null, "tieu_de": null, "text": "string" }
  ],
  "quyen_han_ky": "string (vd: 'TM. ỦY BAN NHÂN DÂN')",
  "chuc_vu_ky": "string (vd: 'CHỦ TỊCH')",
  "ho_ten_ky": "string",
  "noi_nhan": ["string"]
}
`;


export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Get API key from environment
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key chưa được cấu hình. Vui lòng liên hệ quản trị.', code: 'NO_API_KEY' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { type, text, html, file_base64, mime_type } = body;

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu trường "type"', code: 'INVALID_REQUEST' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Build Gemini request
    const startTime = Date.now();
    let geminiBody;

    if (type === 'vision' && file_base64) {
      // Vision: gửi file trực tiếp cho Gemini đọc
      geminiBody = {
        system_instruction: { parts: [{ text: ND30_SYSTEM_PROMPT }] },
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mime_type || 'application/pdf',
                data: file_base64,
              },
            },
            {
              text: 'Đọc và trích xuất toàn bộ nội dung văn bản hành chính trong file/ảnh này. Phân tích cấu trúc thể thức và trả về JSON theo schema đã cho.',
            },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };
    } else {
      // Text: gửi nội dung text
      const inputText = text || '';
      geminiBody = {
        system_instruction: { parts: [{ text: ND30_SYSTEM_PROMPT }] },
        contents: [{
          parts: [{
            text: `Phân tích văn bản hành chính sau và trả về JSON:\n\n${inputText}`,
          }],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };
    }

    // Resolve model from env (set in wrangler.jsonc or Dashboard)
    const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
    const apiUrl = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    // Call Gemini API
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errText);

      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Đã vượt quá giới hạn API. Vui lòng thử lại sau vài phút.', code: 'RATE_LIMIT' }),
          { status: 429, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Lỗi Gemini API: ${geminiResponse.status}`, code: 'GEMINI_ERROR' }),
        { status: 502, headers: corsHeaders }
      );
    }

    const geminiResult = await geminiResponse.json();

    // Extract JSON from Gemini response
    const responseText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return new Response(
        JSON.stringify({ success: false, error: 'Gemini không trả về kết quả hợp lệ.', code: 'EMPTY_RESPONSE' }),
        { status: 502, headers: corsHeaders }
      );
    }

    // Parse JSON (Gemini should return pure JSON with responseMimeType)
    let structuredData;
    try {
      structuredData = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[1]);
      } else {
        console.error('Cannot parse Gemini response:', responseText);
        return new Response(
          JSON.stringify({ success: false, error: 'Không thể phân tích phản hồi từ AI.', code: 'PARSE_ERROR' }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: structuredData,
        duration_ms: duration,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Lỗi server nội bộ', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handle OPTIONS (CORS preflight)
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
