export async function onRequestGet({ request, env }) {
  if (!env.MINERU_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Chưa cấu hình MINERU_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const batchId = url.searchParams.get('batchId');

    if (!batchId) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu batchId param' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mineruResp = await fetch(`https://mineru.net/api/v4/extract-results/batch/${batchId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.MINERU_API_KEY}`
      }
    });

    if (!mineruResp.ok) {
      const txt = await mineruResp.text();
      return new Response(JSON.stringify({ success: false, error: `MinerU lỗi ${mineruResp.status}: ${txt}` }), {
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
    console.error('[/api/mineru-status]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
