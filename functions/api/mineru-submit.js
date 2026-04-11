export async function onRequestPost({ request, env }) {
  if (!env.MINERU_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Chưa cấu hình MINERU_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url, is_ocr } = await request.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu url S3' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mineruResp = await fetch('https://mineru.net/api/v4/extract/task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MINERU_API_KEY}`
      },
      body: JSON.stringify({
        url: url,
        is_ocr: is_ocr || true
      })
    });

    if (!mineruResp.ok) {
      const txt = await mineruResp.text();
      return new Response(JSON.stringify({ success: false, error: `MinerU submit lỗi ${mineruResp.status}: ${txt}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await mineruResp.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[/api/mineru-submit]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
