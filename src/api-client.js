/**
 * API Client — Gọi Workers API endpoint
 */

const API_BASE = '/api';

/**
 * Gửi text/dữ liệu lên Workers API để Gemini phân tích
 * @param {Object} payload - { type, text?, file_base64?, mime_type? }
 * @returns {Promise<Object>} - JSON structured data
 */
export async function processDocument(payload) {
  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('API Error Detail:', error);
    throw new Error(error.error || `Lỗi server: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Không thể phân tích văn bản');
  }

  return result.data;
}

/**
 * Chuyển ArrayBuffer sang base64 string
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
