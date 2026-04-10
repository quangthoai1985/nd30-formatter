/**
 * OCR Engine — Tesseract.js wrapper
 * Lazy-load OCR worker chỉ khi cần (ảnh/scan PDF)
 * Hỗ trợ tiếng Việt (vie language pack)
 * 100% client-side, miễn phí
 */

let worker = null;
let isInitializing = false;

/**
 * Initialize Tesseract worker với tiếng Việt
 * Worker được cache và reuse cho nhiều lần OCR
 */
async function initWorker(onProgress) {
  if (worker) return worker;
  if (isInitializing) {
    // Wait for existing initialization
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return worker;
  }

  isInitializing = true;
  try {
    const { createWorker } = await import('tesseract.js');

    worker = await createWorker('vie', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    return worker;
  } finally {
    isInitializing = false;
  }
}

/**
 * OCR một ảnh → text tiếng Việt
 * @param {Blob|HTMLCanvasElement|string} imageSource - Ảnh đầu vào
 * @param {Function} onProgress - Callback progress (0-100)
 * @returns {Promise<string>} - Text thô
 */
export async function ocrImage(imageSource, onProgress) {
  const w = await initWorker(onProgress);
  const { data: { text } } = await w.recognize(imageSource);
  return text;
}

/**
 * OCR toàn bộ trang của scanned PDF → text tiếng Việt
 * Render từng trang PDF thành canvas → Tesseract OCR
 * @param {ArrayBuffer} pdfBuffer - PDF file buffer
 * @param {Function} onProgress - Callback progress (0-100)
 * @returns {Promise<string>} - Full text từ tất cả các trang
 */
export async function ocrPdfPages(pdfBuffer, onProgress) {
  // Lazy import pdfjs
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  const totalPages = doc.numPages;
  const allText = [];

  // Initialize Tesseract worker ahead of time
  await initWorker(null);

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    // Scale 2x for better OCR accuracy (300 DPI equivalent)
    const viewport = page.getViewport({ scale: 2.0 });

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // OCR this page
    const pageText = await ocrImage(canvas, (pagePct) => {
      // Calculate overall progress across all pages
      const overallPct = Math.round(((i - 1) / totalPages) * 100 + (pagePct / totalPages));
      onProgress?.(overallPct);
    });

    allText.push(pageText.trim());

    // Clean up canvas
    canvas.width = 0;
    canvas.height = 0;
  }

  return allText.join('\n\n');
}

/**
 * Terminate OCR worker to free memory
 */
export async function terminateOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/**
 * Check if OCR worker is ready (language data loaded)
 */
export function isOCRReady() {
  return worker !== null;
}
