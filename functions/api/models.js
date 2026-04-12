/**
 * /api/models — Fetch free models from OpenRouter API
 * Returns list of free model IDs with names for DOCX/text processing
 */

const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';

const FREE_MODEL_PATTERNS = [
  /free/i,
  /:\s*free$/i,
];

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
    const models = data?.data || [];

    const freeModels = models
      .filter(m => {
        const id = m.id || '';
        const context = m.context_window_size;
        return FREE_MODEL_PATTERNS.some(p => p.test(id)) || context === null;
      })
      .map(m => ({
        id: m.id,
        name: m.name || m.id,
        context: m.context_window_size || null,
      }))
      .sort((a, b) => {
        const aFree = isFreeModel(a.id);
        const bFree = isFreeModel(b.id);
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
        return 0;
      });

    const result = {
      success: true,
      models: freeModels,
      cached: false,
      ts: Date.now(),
    };

    await cacheModels(env, freeModels);

    return jsonResponse(result);

  } catch (err) {
    console.error('[/api/models]', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function isFreeModel(id) {
  return /:free$/i.test(id) || /free/i.test(id);
}

async function getCachedModels(env) {
  try {
    const cached = await env.ND30_MODELS_CACHE?.get('free_models');
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    const age = Date.now() - (parsed.ts || 0);
    if (age > 5 * 60 * 1000) return null;
    return parsed;
  } catch { return null; }
}

async function cacheModels(env, models) {
  try {
    if (env.ND30_MODELS_CACHE) {
      await env.ND30_MODELS_CACHE.put('free_models', JSON.stringify({
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