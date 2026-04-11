export async function onRequestPost({ request, env }) {
  if (!env.MINERU_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Chưa cấu hình MINERU_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Nhận file từ client bằng FormData
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !file.name) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy file trong yêu cầu' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Yêu cầu MinerU cấp S3 URL
    const fileUrlsResp = await fetch('https://mineru.net/api/v4/file-urls/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MINERU_API_KEY}`
      },
      body: JSON.stringify({
        files: [{ name: file.name }]
      })
    });

    if (!fileUrlsResp.ok) {
      const txt = await fileUrlsResp.text();
      return new Response(JSON.stringify({ success: false, error: `MinerU cấp URL lỗi ${fileUrlsResp.status}: ${txt}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: initData } = await fileUrlsResp.json();
    const batchId = initData?.batch_id;
    const s3Url = initData?.file_urls?.[0];

    if (!batchId || !s3Url) {
      return new Response(JSON.stringify({ success: false, error: `MinerU trả về dữ liệu khởi tạo không hợp lệ` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Worker tự (proxy) upload file lên S3 để vượt qua tường lửa ISP hoặc Timeout
    const fileBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(s3Url, {
      method: 'PUT',
      body: fileBuffer
    });

    if (!uploadRes.ok) {
       return new Response(JSON.stringify({ success: false, error: `Proxy upload S3 thất bại: ${uploadRes.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Trả về batch_id cho Client để bắt đầu polling vòng lặp
    return new Response(JSON.stringify({ success: true, batchId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[/api/mineru-upload]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
