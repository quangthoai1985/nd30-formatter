/**
 * ND30 Formatter — Main Application (Zero-Cost Edition)
 * SPA controller: routing, UI state, event handling
 * 100% client-side — không cần backend
 */

import './style.css';
import { parseDocx, parsePdf, detectFileType, getMimeType } from './parsers.js';
import { parseVBHC, contentItemsToText, textToContentItems } from './rule-parser.js';
import { downloadND30Docx } from './nd30-docx.js';
import { getSchema } from './doc-schemas.js';


// ═══════════════════════════════════════════
// MODEL PREFERENCES
// ═══════════════════════════════════════════

const VISION_MODEL_DEFS = [
  // ── Free ──
  { id: 'google/gemma-4-26b-a4b-it:free',        name: 'Gemma 4 26B',             free: true },
  { id: 'google/gemma-4-31b-it:free',             name: 'Gemma 4 31B',             free: true },
  // ── Trả phí (sắp xếp theo giá tăng dần) ──
  { id: 'qwen/qwen3.5-9b',                        name: 'Qwen 3.5 9B',             free: false, price: '$0.05/M' },
  { id: 'google/gemini-3.1-flash-lite-preview',   name: 'Gemini 3.1 Flash Lite',   free: false, price: '$0.25/M' },
  { id: 'qwen/qwen3.5-plus-02-15',                name: 'Qwen 3.5 Plus',           free: false, price: '$0.26/M' },
  { id: 'google/gemini-3-flash-preview',           name: 'Gemini 3 Flash',          free: false, price: '$0.50/M' },
  { id: 'qwen/qwen3.6-plus',                      name: 'Qwen 3.6 Plus',           free: false, price: '$0.80/M' },
];

const DEFAULT_TEXT_MODEL_LIST = [
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'google/gemma-4-26b-a4b-it:free',
];

const MODEL_PREFS_KEY = 'nd30_model_prefs';

function loadModelPrefs() {
  try {
    const raw = localStorage.getItem(MODEL_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveModelPrefs(prefs) {
  try { localStorage.setItem(MODEL_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

function getVisionModel() {
  const p = loadModelPrefs();
  return (p?.visionModel) || VISION_MODEL_DEFS[2].id; // default: Gemini 3.1 Flash Lite
}

function getTextModelList() {
  const p = loadModelPrefs();
  return (Array.isArray(p?.textModels) && p.textModels.length > 0)
    ? p.textModels
    : [...DEFAULT_TEXT_MODEL_LIST];
}

function setVisionModel(modelId) {
  const p = loadModelPrefs() || {};
  p.visionModel = modelId;
  saveModelPrefs(p);
}

function setTextModelList(list) {
  const p = loadModelPrefs() || {};
  p.textModels = list;
  saveModelPrefs(p);
}

// ─────────────────────────────────────────────
// Model Panel UI
// ─────────────────────────────────────────────

function renderVisionRadioList() {
  const container = $('vision-radio-list');
  if (!container) return;
  const selected = getVisionModel();
  container.innerHTML = VISION_MODEL_DEFS.map(m => `
    <label class="model-radio-item">
      <input type="radio" name="vision-model" value="${m.id}" ${m.id === selected ? 'checked' : ''}>
      <div class="model-radio-info">
        <span class="model-radio-name">${m.name}</span>
        <span class="model-radio-id">${m.id}</span>
      </div>
      <span class="model-badge ${m.free ? 'model-badge-free' : 'model-badge-paid'}">${m.free ? 'Free' : (m.price || 'Trả phí')}</span>
    </label>
  `).join('');

  container.querySelectorAll('input[name="vision-model"]').forEach(radio => {
    radio.addEventListener('change', () => {
      setVisionModel(radio.value);
      updateModelPanelSummary('upload');
    });
  });
}

function renderTextPriorityList(panelKey) {
  // panelKey: 'upload' | 'text'
  const listId = panelKey === 'upload' ? 'text-priority-list-upload' : 'text-priority-list-text';
  const container = $(listId);
  if (!container) return;
  const models = getTextModelList();

  container.innerHTML = models.map((id, i) => `
    <div class="model-priority-item" data-model="${id}">
      <span class="model-priority-num">${i + 1}</span>
      <span class="model-priority-id" title="${id}">${id}</span>
      <button type="button" class="model-priority-remove" data-remove="${id}" title="Xóa">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.model-priority-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.remove;
      const list = getTextModelList().filter(m => m !== id);
      if (list.length === 0) { showToast('Phải có ít nhất 1 model', 'error'); return; }
      setTextModelList(list);
      renderTextPriorityList('upload');
      renderTextPriorityList('text');
      updateModelPanelSummary('upload');
      updateModelPanelSummary('text');
    });
  });
}

function updateModelPanelSummary(panelKey) {
  const currentEl = $(`model-current-${panelKey}`);
  if (!currentEl) return;
  if (panelKey === 'upload') {
    const fileType = state.selectedFile ? detectFileType(state.selectedFile.name) : '';
    if (fileType === 'pdf' || fileType === 'image') {
      const m = VISION_MODEL_DEFS.find(d => d.id === getVisionModel());
      currentEl.textContent = m ? m.name : getVisionModel();
    } else {
      const list = getTextModelList();
      currentEl.textContent = list.length === 1 ? list[0] : `${list[0]} +${list.length - 1}`;
    }
  } else {
    const list = getTextModelList();
    currentEl.textContent = list.length === 1 ? list[0] : `${list[0]} +${list.length - 1}`;
  }
}

function showUploadModelPanel(fileType) {
  const panel = $('model-panel-upload');
  if (!panel) return;

  const isVision = fileType === 'pdf' || fileType === 'image';
  $('model-vision-list')?.classList.toggle('hidden', !isVision);
  $('model-text-list-upload')?.classList.toggle('hidden', isVision);

  if (isVision) {
    renderVisionRadioList();
  } else {
    renderTextPriorityList('upload');
  }
  updateModelPanelSummary('upload');
  panel.classList.remove('hidden');
}

function setupAddModelButton(panelKey) {
  const inputId = `text-model-add-input-${panelKey}`;
  const btnId = `text-model-add-btn-${panelKey}`;
  const input = $(inputId);
  const btn = $(btnId);
  if (!input || !btn) return;

  const doAdd = () => {
    const val = input.value.trim();
    if (!val) return;
    const list = getTextModelList();
    if (list.includes(val)) { showToast('Model đã có trong danh sách', 'error'); return; }
    list.push(val);
    setTextModelList(list);
    input.value = '';
    renderTextPriorityList('upload');
    renderTextPriorityList('text');
    updateModelPanelSummary('upload');
    updateModelPanelSummary('text');
  };

  btn.addEventListener('click', doAdd);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
}

function setupModelPanelToggle(panelKey) {
  const toggleBtn = $(`model-panel-toggle-${panelKey}`);
  const body = $(`model-panel-body-${panelKey}`);
  if (!toggleBtn || !body) return;
  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    body.hidden = expanded;
  });
}


// ═══════════════════════════════════════════
// BACKEND OCR HELPERS (OpenRouter Vision API)
// ═══════════════════════════════════════════

/**
 * Gộp kết quả OpenRouter AI với rule-parser.
 * AI được ưu tiên cho các field metadata; rule-parser giữ noi_dung nếu AI trả noi_dung_text.
 */
function mergeExtracted(aiResult, ruleResult) {
  if (!aiResult) return ruleResult;
  const merged = { ...ruleResult };
  for (const [key, val] of Object.entries(aiResult)) {
    if (key === 'noi_dung') continue; // rule-parser xử lý cấu trúc Điều/Khoản/Điểm tốt hơn
    if (key === 'noi_dung_text') continue; // xử lý riêng bên dưới
    const isEmpty = val === null || val === undefined || val === ''
      || (Array.isArray(val) && val.length === 0);
    if (!isEmpty) merged[key] = val;
  }
  return merged;
}

/**
 * Render các trang PDF thành ảnh base64 bằng pdfjs (đã có sẵn trong project).
 */
async function pdfToBase64Images(fileBuffer) {
  const pdfjsLib = await import('pdfjs-dist');

  // Cấu hình worker cho pdfjs (cùng URL với parsers.js)
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) }).promise;
  const images = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 2; // 2x cho chất lượng OCR tốt
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    }).promise;

    // Chuyển canvas → base64 PNG (data URL)
    images.push(canvas.toDataURL('image/png'));
  }

  return images;
}

/**
 * Chuyển ảnh (file buffer) sang base64 data URL.
 */
function imageToBase64(fileBuffer, fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const base64 = btoa(
    new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:${mime};base64,${base64}`;
}

/**
 * Gọi OpenRouter Vision API qua Cloudflare Worker proxy.
 * Trả về { structuredData, ocrText } hoặc null nếu thất bại.
 */
async function tryBackendOCR(fileBuffer, fileName) {
  try {
    const fileType = detectFileType(fileName);
    let images;

    // Clone buffer vì pdfjs sẽ detach ArrayBuffer gốc
    const bufferCopy = fileBuffer.slice(0);

    // Bước 1: Chuyển file → ảnh base64
    if (fileType === 'pdf') {
      setProcessingStatus('1/3 Đang render các trang PDF thành ảnh...');
      images = await pdfToBase64Images(bufferCopy);
    } else {
      // File ảnh → 1 ảnh duy nhất
      setProcessingStatus('1/3 Đang chuẩn bị ảnh...');
      images = [imageToBase64(bufferCopy, fileName)];
    }

    if (!images || images.length === 0) {
      throw new Error('Không thể chuyển file sang ảnh');
    }

    // Bước 2: Gọi OpenRouter Vision API
    setProcessingStatus(`2/3 Đang gọi AI nhận dạng văn bản (${images.length} trang)...`);
    const res = await fetch('/api/ocr-openrouter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, preferredModel: getVisionModel() }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi API: ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.extracted) {
      throw new Error(data.error || 'API không trả về kết quả hợp lệ');
    }

    // Bước 3: Merge với rule-parser
    setProcessingStatus('3/3 Đang phân tích cấu trúc văn bản...');
    const aiExtracted = data.extracted;

    // Dùng noi_dung_text từ AI để chạy qua rule-parser (bóc tách Điều/Khoản/Điểm)
    const ocrText = aiExtracted.noi_dung_text || '';
    const ruleResult = ocrText.length > 20 ? parseVBHC(ocrText) : {};

    const structuredData = mergeExtracted(aiExtracted, ruleResult);

    // Nếu rule-parser không parse được noi_dung, dùng text thô từ AI
    if ((!structuredData.noi_dung || structuredData.noi_dung.length === 0) && ocrText) {
      structuredData.noi_dung = [{ type: 'doan', so: null, tieu_de: null, text: ocrText }];
    }

    console.log(`OCR thành công qua model: ${data.model_used}`);
    return { structuredData, ocrText };

  } catch (err) {
    console.error('tryBackendOCR error:', err);
    return null;
  }
}

/**
 * Gọi OpenRouter text model để phân tích văn bản đã có text (DOCX / nhập tay).
 * Không cần vision — dùng model free text.
 */
async function tryTextAI(text) {
  try {
    setProcessingStatus('Đang gọi AI phân tích văn bản (OpenRouter)...');
    const res = await fetch('/api/ocr-openrouter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, modelList: getTextModelList() }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi API: ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.extracted) {
      throw new Error(data.error || 'API không trả về kết quả hợp lệ');
    }

    const aiExtracted = data.extracted;
    const ocrText = aiExtracted.noi_dung_text || text;
    const ruleResult = ocrText.length > 20 ? parseVBHC(ocrText) : parseVBHC(text);
    const structuredData = mergeExtracted(aiExtracted, ruleResult);

    if ((!structuredData.noi_dung || structuredData.noi_dung.length === 0) && ocrText) {
      structuredData.noi_dung = [{ type: 'doan', so: null, tieu_de: null, text: ocrText }];
    }

    console.log(`Text AI thành công qua model: ${data.model_used}`);
    return { structuredData };

  } catch (err) {
    console.error('tryTextAI error:', err);
    return null;
  }
}

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════

const state = {
  currentView: 'home',
  selectedFile: null,
  selectedFileBuffer: null,
  parsedData: null,        // JSON from rule-parser
  isProcessing: false,
  lastInputView: 'home',   // Track where user came from
};


// ═══════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const views = {
  home: $('view-home'),
  upload: $('view-upload'),
  text: $('view-text'),
  processing: $('view-processing'),
  review: $('view-review'),
  result: $('view-result'),
  guide: $('view-guide'),
  error: $('view-error'),
};


// ═══════════════════════════════════════════
// SPA ROUTER
// ═══════════════════════════════════════════

function navigateTo(viewName) {
  // Hide all views
  Object.values(views).forEach(v => v?.classList.remove('active'));

  // Show target view
  const target = views[viewName];
  if (target) {
    target.classList.add('active');
    state.currentView = viewName;
  }

  // Update nav active state
  $$('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Close mobile sidebar
  $('sidebar')?.classList.remove('open');
  $('sidebar-overlay')?.classList.remove('active');
}


// ═══════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════

function showToast(message, type = 'info') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}


// ═══════════════════════════════════════════
// PROCESSING STEPS UI
// ═══════════════════════════════════════════

function setStep(stepId, status) {
  const step = $(stepId);
  if (!step) return;
  step.classList.remove('active', 'done');
  if (status) step.classList.add(status);
}

function setProcessingStatus(text) {
  const el = $('processing-status');
  if (el) el.textContent = text;
}

function showOcrStep(show) {
  const ocrStep = $('step-ocr');
  if (ocrStep) {
    ocrStep.style.display = show ? 'flex' : 'none';
  }
}


// ═══════════════════════════════════════════
// FILE UPLOAD HANDLING
// ═══════════════════════════════════════════

function setupDropZone() {
  const dropZone = $('drop-zone');
  const fileInput = $('file-input');

  if (!dropZone || !fileInput) return;

  // Click to select file
  dropZone.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Drag & Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  // Remove file
  $('file-remove')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelectedFile();
  });
}

function handleFileSelected(file) {
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('File quá lớn. Giới hạn 10MB.', 'error');
    return;
  }

  // Validate file type
  const fileType = detectFileType(file.name);
  if (fileType === 'unknown') {
    showToast('Định dạng file không hỗ trợ. Hãy sử dụng DOCX, PDF, JPG hoặc PNG.', 'error');
    return;
  }

  state.selectedFile = file;

  // Read file to ArrayBuffer
  const reader = new FileReader();
  reader.onload = () => {
    state.selectedFileBuffer = reader.result;
  };
  reader.readAsArrayBuffer(file);

  // Update UI
  $('file-name').textContent = file.name;
  $('file-size').textContent = formatFileSize(file.size);
  $('file-info')?.classList.remove('hidden');
  $('btn-process-file')?.classList.remove('hidden');
  $('btn-process-file').disabled = false;

  // Show model selector
  showUploadModelPanel(fileType);
}

function clearSelectedFile() {
  state.selectedFile = null;
  state.selectedFileBuffer = null;
  $('file-input').value = '';
  $('file-info')?.classList.add('hidden');
  $('btn-process-file')?.classList.add('hidden');
  $('btn-process-file').disabled = true;
  $('model-panel-upload')?.classList.add('hidden');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}


// ═══════════════════════════════════════════
// TEXT INPUT HANDLING
// ═══════════════════════════════════════════

function setupTextInput() {
  const textarea = $('text-input');
  const charCount = $('char-count');
  const btnProcess = $('btn-process-text');

  if (!textarea) return;

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    charCount.textContent = len;
    btnProcess.disabled = len < 20; // Minimum 20 chars
  });
}


// ═══════════════════════════════════════════
// PROCESS FILE (Upload flow)
// ═══════════════════════════════════════════

async function processFile() {
  if (!state.selectedFile || !state.selectedFileBuffer) return;
  if (state.isProcessing) return;

  state.isProcessing = true;
  state.lastInputView = 'upload';
  navigateTo('processing');

  try {
    const fileType = detectFileType(state.selectedFile.name);
    let extractedText = '';
    const isImage = fileType === 'image';

    // Show/hide OCR step
    showOcrStep(isImage);

    // Step 1: Read file content
    setStep('step-parse', 'active');
    setProcessingStatus('Đang đọc nội dung file...');

    if (fileType === 'docx') {
      // Parse DOCX → text
      const { text } = await parseDocx(state.selectedFileBuffer);
      extractedText = text;
      setStep('step-parse', 'done');

      // Gọi AI text model phân tích (free models, không cần vision)
      if (extractedText && extractedText.trim().length > 20) {
        showOcrStep(true);
        setStep('step-ocr', 'active');
        setProcessingStatus('Đang phân tích nội dung DOCX bằng AI...');
        const aiResult = await tryTextAI(extractedText);
        if (aiResult) {
          setStep('step-ocr', 'done');
          setStep('step-analyze', 'done');
          state.parsedData = aiResult.structuredData;
          populateReviewForm(state.parsedData);
          navigateTo('review');
          showToast('Phân tích AI hoàn tất. Vui lòng kiểm tra kết quả.', 'success');
          return;
        }
        setStep('step-ocr', 'done');
        setProcessingStatus('AI thất bại, dùng phân tích rule-based...');
      }

    } else if (fileType === 'pdf') {
      // Luôn thử OpenRouter AI trước cho MỌI PDF (cả text và scan).
      // pdf.js trích xuất text không theo thứ tự đọc với bố cục 2 cột
      // đặc trưng của văn bản hành chính ND30, dẫn đến rule-parser thất bại.
      showOcrStep(true);
      setStep('step-parse', 'done');
      setStep('step-ocr', 'active');
      setProcessingStatus('Đang nhận dạng bản tài liệu (OpenRouter AI)...');

      const backendResult = await tryBackendOCR(state.selectedFileBuffer, state.selectedFile.name);
      if (backendResult) {
        setStep('step-ocr', 'done');
        setStep('step-analyze', 'done');
        state.parsedData = backendResult.structuredData;
        populateReviewForm(state.parsedData);
        navigateTo('review');
        showToast('Phân tích hoàn tất. Vui lòng kiểm tra kết quả.', 'success');
        return;
      }

      // Fallback: pdf.js text extraction (nếu MinerU thất bại)
      setProcessingStatus('AI thất bại, thử trích xuất text PDF cơ bản...');
      const { text, isScanned } = await parsePdf(state.selectedFileBuffer);

      if (isScanned) {
        // PDF scan không có text → Tesseract.js
        setProcessingStatus('PDF scan, đang dùng OCR dự phòng...');
        const { ocrPdfPages } = await import('./ocr-engine.js');
        extractedText = await ocrPdfPages(state.selectedFileBuffer, (pct) => {
          setProcessingStatus(`OCR dự phòng đang đọc PDF scan... ${pct}%`);
        });
      } else {
        extractedText = text;
      }
      setStep('step-ocr', 'done');

    } else if (isImage) {
      setStep('step-parse', 'done');
      setStep('step-ocr', 'active');
      setProcessingStatus('Đang nhận dạng ảnh (OpenRouter AI)...');

      const backendResult = await tryBackendOCR(state.selectedFileBuffer, state.selectedFile.name);
      if (backendResult) {
        setStep('step-ocr', 'done');
        setStep('step-analyze', 'done');
        state.parsedData = backendResult.structuredData;
        populateReviewForm(state.parsedData);
        navigateTo('review');
        showToast('Phân tích hoàn tất. Vui lòng kiểm tra kết quả.', 'success');
        return;
      }

      // Fallback: Tesseract.js
      setProcessingStatus('AI thất bại, đang dùng OCR dự phòng...');
      const { ocrImage } = await import('./ocr-engine.js');
      const blob = new Blob([state.selectedFileBuffer]);
      extractedText = await ocrImage(blob, (pct) => {
        setProcessingStatus(`OCR dự phòng đang đọc ảnh... ${pct}%`);
      });
      setStep('step-ocr', 'done');
    }

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error('Không thể trích xuất nội dung từ file. Vui lòng thử file khác hoặc sử dụng phương thức "Nhập Text".');
    }

    // Step 2: Rule-based parsing
    setStep('step-analyze', 'active');
    setProcessingStatus('Đang phân tích cấu trúc văn bản...');

    const structuredData = parseVBHC(extractedText);
    setStep('step-analyze', 'done');

    // Show review form
    state.parsedData = structuredData;
    populateReviewForm(structuredData);
    navigateTo('review');
    showToast('Phân tích hoàn tất. Vui lòng kiểm tra kết quả.', 'success');

  } catch (error) {
    console.error('Process file error:', error);
    showError(error.message);
  } finally {
    state.isProcessing = false;
    resetSteps();
  }
}


// ═══════════════════════════════════════════
// PROCESS TEXT (Text input flow)
// ═══════════════════════════════════════════

async function processText() {
  const textarea = $('text-input');
  const text = textarea?.value?.trim();
  if (!text || text.length < 20) return;
  if (state.isProcessing) return;

  state.isProcessing = true;
  state.lastInputView = 'text';
  navigateTo('processing');

  try {
    // Step 1: Read done immediately (text already available)
    setStep('step-parse', 'done');

    // Step 2: Thử AI text model trước
    showOcrStep(true);
    setStep('step-ocr', 'active');
    setProcessingStatus('Đang phân tích văn bản bằng AI (OpenRouter)...');

    const aiResult = await tryTextAI(text);
    if (aiResult) {
      setStep('step-ocr', 'done');
      setStep('step-analyze', 'done');
      state.parsedData = aiResult.structuredData;
      populateReviewForm(state.parsedData);
      navigateTo('review');
      showToast('Phân tích AI hoàn tất. Vui lòng kiểm tra kết quả.', 'success');
      return;
    }

    // Fallback: rule-based parsing
    setStep('step-ocr', 'done');
    setStep('step-analyze', 'active');
    setProcessingStatus('AI thất bại, đang phân tích rule-based...');
    await new Promise(r => setTimeout(r, 300));

    const structuredData = parseVBHC(text);
    setStep('step-analyze', 'done');

    state.parsedData = structuredData;
    populateReviewForm(structuredData);
    navigateTo('review');
    showToast('Phân tích hoàn tất (rule-based). Vui lòng kiểm tra kết quả.', 'success');

  } catch (error) {
    console.error('Process text error:', error);
    showError(error.message);
  } finally {
    state.isProcessing = false;
    resetSteps();
  }
}


// ═══════════════════════════════════════════
// DOC-TYPE SCHEMA — Điều chỉnh form theo loại VB
// ═══════════════════════════════════════════

/**
 * Áp dụng schema của loại văn bản lên form review.
 * Ẩn/hiện section, cập nhật label, placeholder, gợi ý nội dung.
 */
function applyDocSchema(loai) {
  const schema = getSchema(loai);

  // ── Section: Tên loại VB ──
  const secTenLoai = $('section-ten-loai');
  if (secTenLoai) secTenLoai.hidden = schema ? !schema.showTenLoai : false;

  // ── Section: Căn cứ ban hành ──
  const secCanCu = $('section-can-cu');
  if (secCanCu) secCanCu.hidden = schema ? !schema.showCanCu : false;

  // ── Section: Kính gửi ──
  const secKinhGui = $('section-kinh-gui');
  if (secKinhGui) secKinhGui.hidden = schema ? !schema.showKinhGui : false;

  if (!schema) return;

  // ── Label trích yếu ──
  const lblTrichYeu = $('label-trich-yeu');
  if (lblTrichYeu) lblTrichYeu.textContent = schema.trichYeuLabel ?? 'Trích yếu';

  // ── Placeholder trích yếu ──
  const txtTrichYeu = $('review-trich-yeu');
  if (txtTrichYeu && schema.trichYeuPlaceholder) {
    txtTrichYeu.placeholder = schema.trichYeuPlaceholder;
  }

  // ── Placeholder + gợi ý nội dung ──
  const txtNoiDung = $('review-noi-dung-raw');
  if (txtNoiDung && schema.noiDungPlaceholder) {
    txtNoiDung.placeholder = schema.noiDungPlaceholder;
  }

  const hintEl = $('noi-dung-hint');
  if (hintEl) {
    hintEl.textContent = schema.noiDungHint ?? '';
    hintEl.hidden = !schema.noiDungHint;
  }
}


// ═══════════════════════════════════════════
// REVIEW FORM
// ═══════════════════════════════════════════

/**
 * Populate review form with parsed data
 */
function populateReviewForm(data) {
  // Thông tin chung
  const loaiVBSelect = $('review-loai-vb');
  if (loaiVBSelect) {
    loaiVBSelect.value = data.loai_van_ban || '';
  }
  setVal('review-ten-loai', data.ten_loai_vb);

  // Cơ quan
  setVal('review-cq-chu-quan', data.co_quan_chu_quan);
  setVal('review-cq-ban-hanh', data.co_quan_ban_hanh);

  // Số ký hiệu
  setVal('review-so', data.so);
  setVal('review-ky-hieu', data.ky_hieu);
  setVal('review-dia-danh', data.dia_danh);
  setVal('review-ngay', data.ngay);
  setVal('review-thang', data.thang);
  setVal('review-nam', data.nam);

  // Trích yếu
  setVal('review-trich-yeu', data.trich_yeu);

  // Chức danh ban hành
  setVal('review-chuc-danh-ban-hanh', data.chuc_danh_ban_hanh);

  // Căn cứ (mỗi dòng = 1 item)
  setVal('review-can-cu', Array.isArray(data.can_cu) ? data.can_cu.join('\n') : '');

  // Kính gửi (mỗi dòng = 1 item)
  setVal('review-kinh-gui', Array.isArray(data.kinh_gui) ? data.kinh_gui.join('\n') : '');

  // Nội dung (convert items → text)
  const noiDungText = contentItemsToText(data.noi_dung || []);
  setVal('review-noi-dung-raw', noiDungText);

  // Render preview
  renderNoiDungPreview(data.noi_dung || []);

  // Ký tên
  setVal('review-quyen-han', data.quyen_han_ky);
  setVal('review-chuc-vu', data.chuc_vu_ky);
  setVal('review-ho-ten', data.ho_ten_ky);

  // Nơi nhận (mỗi dòng = 1 item)
  setVal('review-noi-nhan', Array.isArray(data.noi_nhan) ? data.noi_nhan.join('\n') : '');

  // Điều chỉnh form theo loại văn bản đã nhận diện
  applyDocSchema(data.loai_van_ban);
}

/**
 * Collect all values from review form → structured JSON
 */
function collectReviewData() {
  const noiDungRaw = getVal('review-noi-dung-raw');
  const noiDungItems = textToContentItems(noiDungRaw);

  return {
    loai_van_ban: $('review-loai-vb')?.value || '',
    ten_loai_vb: getVal('review-ten-loai'),
    co_quan_chu_quan: getVal('review-cq-chu-quan'),
    co_quan_ban_hanh: getVal('review-cq-ban-hanh'),
    so: getVal('review-so'),
    ky_hieu: getVal('review-ky-hieu'),
    dia_danh: getVal('review-dia-danh'),
    ngay: getVal('review-ngay'),
    thang: getVal('review-thang'),
    nam: getVal('review-nam'),
    trich_yeu: getVal('review-trich-yeu'),
    chuc_danh_ban_hanh: getVal('review-chuc-danh-ban-hanh'),
    can_cu: splitLines(getVal('review-can-cu')),
    kinh_gui: splitLines(getVal('review-kinh-gui')),
    noi_dung: noiDungItems,
    quyen_han_ky: getVal('review-quyen-han'),
    chuc_vu_ky: getVal('review-chuc-vu'),
    ho_ten_ky: getVal('review-ho-ten'),
    noi_nhan: splitLines(getVal('review-noi-nhan')),
  };
}

/**
 * Render structured content preview with badges
 */
function renderNoiDungPreview(items) {
  const container = $('review-noi-dung-preview');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="preview-empty">Không có nội dung được phân tích</p>';
    return;
  }

  const typeLabels = {
    dieu: 'Điều',
    khoan: 'Khoản',
    diem: 'Điểm',
    muc_lon: 'Mục',
    doan: 'Đoạn',
  };

  const typeColors = {
    dieu: 'badge-dieu',
    khoan: 'badge-khoan',
    diem: 'badge-diem',
    muc_lon: 'badge-muc',
    doan: 'badge-doan',
  };

  const html = items.map(item => {
    const label = typeLabels[item.type] || item.type;
    const colorClass = typeColors[item.type] || 'badge-doan';
    const so = item.so ? ` ${item.so}` : '';
    const shortText = (item.text || '').substring(0, 100) + ((item.text || '').length > 100 ? '...' : '');

    return `<div class="noi-dung-item">
      <span class="noi-dung-badge ${colorClass}">${label}${so}</span>
      <span class="noi-dung-text">${escapeHtml(shortText)}</span>
    </div>`;
  }).join('');

  container.innerHTML = html;
}


// ═══════════════════════════════════════════
// VALIDATION TRƯỚC KHI XUẤT DOCX
// ═══════════════════════════════════════════

/**
 * Kiểm tra các trường bắt buộc trước khi xuất DOCX.
 * Trả về danh sách cảnh báo (warnings) và lỗi (errors).
 */
function validateData(data) {
  const errors = [];
  const warnings = [];

  // Trường bắt buộc
  if (!data.co_quan_ban_hanh?.trim()) errors.push('Thiếu tên cơ quan ban hành');
  if (!data.so?.trim())               errors.push('Thiếu số văn bản');
  if (!data.ky_hieu?.trim())          errors.push('Thiếu ký hiệu văn bản');
  if (!data.trich_yeu?.trim())        errors.push('Thiếu trích yếu nội dung');

  // Kiểm tra ngày tháng năm
  const ngay = parseInt(data.ngay, 10);
  const thang = parseInt(data.thang, 10);
  const nam = parseInt(data.nam, 10);

  if (!data.ngay || isNaN(ngay) || ngay < 1 || ngay > 31) {
    errors.push('Ngày không hợp lệ (phải từ 01–31)');
  }
  if (!data.thang || isNaN(thang) || thang < 1 || thang > 12) {
    errors.push('Tháng không hợp lệ (phải từ 01–12)');
  }
  if (!data.nam || isNaN(nam) || nam < 1990 || nam > 2100) {
    errors.push('Năm không hợp lệ');
  }
  if (!data.dia_danh?.trim()) {
    warnings.push('Thiếu địa danh trong dòng ngày tháng');
  }

  // Kiểm tra nội dung
  if (!data.noi_dung || data.noi_dung.length === 0) {
    warnings.push('Chưa có nội dung văn bản');
  }

  // Kiểm tra ký tên
  if (!data.ho_ten_ky?.trim()) {
    warnings.push('Thiếu họ tên người ký');
  }

  return { errors, warnings };
}


// ═══════════════════════════════════════════
// CREATE DOCX FROM REVIEW
// ═══════════════════════════════════════════

async function createDocxFromReview() {
  try {
    const data = collectReviewData();

    // Validate trước khi xuất
    const { errors, warnings } = validateData(data);

    if (errors.length > 0) {
      showToast('Không thể xuất DOCX:\n• ' + errors.join('\n• '), 'error');
      return;
    }

    if (warnings.length > 0) {
      // Cảnh báo nhưng vẫn cho phép xuất
      showToast('Lưu ý: ' + warnings.join(' | '), 'warning');
    }

    state.parsedData = data;
    const filename = await downloadND30Docx(data);
    showResult(data, filename);

  } catch (error) {
    console.error('Create DOCX error:', error);
    showToast('Lỗi khi tạo file DOCX: ' + error.message, 'error');
  }
}


// ═══════════════════════════════════════════
// RESULT & ERROR VIEWS
// ═══════════════════════════════════════════

function showResult(data, filename) {
  // Map document type codes to Vietnamese names
  const typeMap = {
    'QD': 'Quyết định', 'CV': 'Công văn', 'TB': 'Thông báo',
    'TTR': 'Tờ trình', 'BC': 'Báo cáo', 'KH': 'Kế hoạch',
    'CT': 'Chỉ thị', 'HD': 'Hướng dẫn', 'NQ': 'Nghị quyết',
    'BB': 'Biên bản',
  };

  $('result-type').textContent = typeMap[data.loai_van_ban?.toUpperCase()] || data.ten_loai_vb || data.loai_van_ban || '—';
  $('result-org').textContent = data.co_quan_ban_hanh || '—';
  $('result-number').textContent = data.so && data.ky_hieu ? `${data.so}/${data.ky_hieu}` : '—';
  $('result-summary').textContent = data.trich_yeu || '—';

  navigateTo('result');
  showToast('Đã tạo file DOCX thành công!', 'success');
}

function showError(message) {
  $('error-message').textContent = message || 'Đã xảy ra lỗi không xác định.';
  navigateTo('error');
}

function resetSteps() {
  ['step-parse', 'step-ocr', 'step-analyze'].forEach(id => setStep(id, null));
}


// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function setVal(id, value) {
  const el = $(id);
  if (el) el.value = value || '';
}

function getVal(id) {
  const el = $(id);
  return el ? el.value.trim() : '';
}

function splitLines(text) {
  if (!text) return [];
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// ═══════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════

function initEventListeners() {
  // Navigation
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
    });
  });

  // Feature cards on home page
  $('feature-upload')?.addEventListener('click', () => navigateTo('upload'));
  $('feature-text')?.addEventListener('click', () => navigateTo('text'));
  $('feature-guide')?.addEventListener('click', () => navigateTo('guide'));

  // Process buttons
  $('btn-process-file')?.addEventListener('click', processFile);
  $('btn-process-text')?.addEventListener('click', processText);

  // Review form buttons
  $('btn-create-docx')?.addEventListener('click', createDocxFromReview);
  $('btn-back-input')?.addEventListener('click', () => {
    navigateTo(state.lastInputView || 'home');
  });

  // Download again
  $('btn-download')?.addEventListener('click', () => {
    if (state.parsedData) {
      downloadND30Docx(state.parsedData);
    }
  });

  // New document
  $('btn-new')?.addEventListener('click', () => {
    clearSelectedFile();
    state.parsedData = null;
    navigateTo('home');
  });

  // Retry
  $('btn-retry')?.addEventListener('click', () => {
    navigateTo('home');
  });

  // Mobile menu
  $('menu-toggle')?.addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
    $('sidebar-overlay').classList.toggle('active');
  });

  $('sidebar-overlay')?.addEventListener('click', () => {
    $('sidebar').classList.remove('open');
    $('sidebar-overlay').classList.remove('active');
  });

  // Khi user đổi loại văn bản → cập nhật form ngay lập tức
  $('review-loai-vb')?.addEventListener('change', (e) => {
    applyDocSchema(e.target.value);
  });

  // Sync nội dung textarea with preview (live re-render on input)
  $('review-noi-dung-raw')?.addEventListener('input', () => {
    const text = getVal('review-noi-dung-raw');
    const items = textToContentItems(text);
    renderNoiDungPreview(items);
  });

  // Model panel toggles & add buttons
  setupModelPanelToggle('upload');
  setupModelPanelToggle('text');
  setupAddModelButton('upload');
  setupAddModelButton('text');
  // Render text panel for text view on load
  renderTextPriorityList('text');
  updateModelPanelSummary('text');
}


// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

function init() {
  setupDropZone();
  setupTextInput();
  initEventListeners();
  navigateTo('home');

  console.log('🏛️ ND30 Formatter initialized (Zero-Cost Edition)');
}

// Start
document.addEventListener('DOMContentLoaded', init);
