/**
 * Proxy tải file ZIP kết quả từ MinerU CDN.
 * Giải quyết lỗi CORS khi trình duyệt gọi trực tiếp tới cdn-mineru.openxlab.org.cn
 * 
 * GET /api/mineru-download?url=<encoded_zip_url>
 */
export async function onRequestGet({ request }) {
  const reqUrl = new URL(request.url);
  const zipUrl = reqUrl.searchParams.get('url');

  if (!zipUrl) {
    return new Response(JSON.stringify({ error: 'Thiếu tham số url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const zipRes = await fetch(zipUrl);

    if (!zipRes.ok) {
      return new Response(JSON.stringify({ error: `CDN trả về lỗi ${zipRes.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream trả thẳng body ZIP về client, thêm CORS headers
    return new Response(zipRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('[/api/mineru-download]', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
