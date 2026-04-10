/**
 * Parsers — Client-side file parsing
 * Trích xuất text từ DOCX (mammoth) và PDF (pdfjs-dist)
 */

import mammoth from 'mammoth';

/**
 * Parse DOCX file → extract text + HTML
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{text: string, html: string}>}
 */
export async function parseDocx(arrayBuffer) {
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer }),
  ]);

  return {
    text: textResult.value,
    html: htmlResult.value,
  };
}

/**
 * Parse PDF file → extract text (text-based PDF)
 * Falls back to vision if no text found (scanned PDF)
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{text: string, isScanned: boolean}>}
 */
export async function parsePdf(arrayBuffer) {
  try {
    // Dynamically import pdfjs-dist (lazy load)
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const pages = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      pages.push(pageText);
    }

    const fullText = pages.join('\n\n').trim();

    // Nếu text rất ít → có thể là PDF scan
    const isScanned = fullText.length < 50;

    return { text: fullText, isScanned };
  } catch (error) {
    console.warn('PDF parse error, falling back to vision:', error);
    return { text: '', isScanned: true };
  }
}

/**
 * Detect file type from file name/extension
 */
export function detectFileType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'docx': return 'docx';
    case 'pdf': return 'pdf';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp': return 'image';
    default: return 'unknown';
  }
}

/**
 * Get MIME type from filename
 */
export function getMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeMap = {
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
  };
  return mimeMap[ext] || 'application/octet-stream';
}
