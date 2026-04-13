/**
 * /api/models — Fetch models from OpenRouter API
 * Returns all models with pricing info and vision capability flag.
 * Frontend uses this to populate model selectors for both Vision (PDF/Image) and Text (DOCX/Plaintext).
 */

const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL = 30 * 60 * 1000; // 30 phút

export async function onRequestGet({ request, env }) {
  if (!env.OPENROUTER_API_KEY) {
    return jsonResponse({ success: false, error: 'Chưa cấu hình OPENROUTER_API_KEY' }, 500);
  }

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    if (!force) {
      const cached = await getCachedModels(env);
      if (cached) {
        return jsonResponse({ success: true, models: cached.models, cached: true, ts: cached.ts });
      }
    }

    const response = await fetch(OPENROUTER_API, {
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://nd30.pages.dev',
        'X-Title': 'ND30 Formatter',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return jsonResponse({ success: false, error: `OpenRouter API lỗi ${response.status}: ${errText.substring(0, 200)}` }, response.status);
    }

    const data = await response.json();
    const rawModels = data?.data || [];

    const models = rawModels
      .filter(m => {
        if (!m.id) return false;
        // Phải có pricing info
        if (!m.pricing) return false;
        const promptPrice = parseFloat(m.pricing.prompt || '0');
        // Loại bỏ model quá đắt (> $20/M tokens)
        if (promptPrice > 0.00002) return false;
        return true;
      })
      .map(m => {
        const promptPrice = parseFloat(m.pricing.prompt || '0');
        const pricePerM = promptPrice * 1_000_000;
        const modality = m.architecture?.modality || '';
        const isFree = promptPrice === 0 || /:free$/i.test(m.id);
        const supportsVision = /image/i.test(modality);

        return {
          id: m.id,
          name: m.name || m.id,
          price: isFree ? 0 : Math.round(pricePerM * 100) / 100,
          vision: supportsVision,
          free: isFree,
        };
      })
      .sort((a, b) => {
        // Free trước, rồi theo giá tăng dần
        if (a.free && !b.free) return -1;
        if (!a.free && b.free) return 1;
        return a.price - b.price;
      });

    const result = {
      success: true,
      models,
      cached: false,
      ts: Date.now(),
    };

    await cacheModels(env, models);
    return jsonResponse(result);

  } catch (err) {
    console.error('[/api/models]', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

async function getCachedModels(env) {
  try {
    const cached = await env.ND30_MODELS_CACHE?.get('all_models');
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    const age = Date.now() - (parsed.ts || 0);
    if (age > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

async function cacheModels(env, models) {
  try {
    if (env.ND30_MODELS_CACHE) {
      await env.ND30_MODELS_CACHE.put('all_models', JSON.stringify({
        models,
        ts: Date.now(),
      }));
    }
  } catch (e) {
    console.warn('Cache models failed:', e);
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
