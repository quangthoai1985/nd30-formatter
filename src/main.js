/**
 * VBFormatter — Main Application (NĐ30 + HD36)
 * SPA controller: routing, UI state, event handling
 * 100% client-side — không cần backend
 */

import './style.css';
import { parseDocx, parsePdf, detectFileType, getMimeType } from './parsers.js';
import { parseVBHC, contentItemsToText, textToContentItems } from './rule-parser.js';
import { downloadND30Docx } from './nd30-docx.js';
import { downloadHD36Docx } from './hd36-docx.js';
import { getSchema } from './doc-schemas.js';
import { getHD36Schema, isHD36Type } from './hd36-schemas.js';


// ═══════════════════════════════════════════
// MODEL PREFERENCES (Auto-fetch từ OpenRouter)
// ═══════════════════════════════════════════

// Fallback defaults nếu chưa fetch được từ API
// Đa dạng nhà cung cấp để tránh bị block theo region (không chỉ Google)
const DEFAULT_VISION_MODEL_LIST = [
  'qwen/qwen3.5-9b',                          // $0.05/M, vision, Qwen
  'bytedance-seed/seed-1.6-flash',             // $0.075/M, vision, ByteDance
  'google/gemini-3.1-flash-lite-preview',      // $0.25/M, vision, Google
  'google/gemini-3-flash-preview',             // $0.50/M, vision, Google
  'nvidia/nemotron-3-super-120b-a12b:free',    // Free, vision, NVIDIA
  'google/gemma-4-31b-it:free',                // Free, vision, Google
];

const DEFAULT_TEXT_MODEL_LIST = [
  'qwen/qwen3.5-9b',                          // $0.05/M, Qwen
  'bytedance-seed/seed-1.6-flash',             // $0.075/M, ByteDance
  'google/gemini-3.1-flash-lite-preview',      // $0.25/M, Google
  'google/gemini-3-flash-preview',             // $0.50/M, Google
  'nvidia/nemotron-3-super-120b-a12b:free',    // Free, NVIDIA
  'google/gemma-4-31b-it:free',                // Free, Google
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

function getVisionModelList() {
  const p = loadModelPrefs();
  return (Array.isArray(p?.visionModels) && p.visionModels.length > 0)
    ? p.visionModels
    : [...DEFAULT_VISION_MODEL_LIST];
}

function getTextModelList() {
  const p = loadModelPrefs();
  return (Array.isArray(p?.textModels) && p.textModels.length > 0)
    ? p.textModels
    : [...DEFAULT_TEXT_MODEL_LIST];
}

function setVisionModelList(list) {
  const p = loadModelPrefs() || {};
  p.visionModels = list;
  saveModelPrefs(p);
}

function setTextModelList(list) {
  const p = loadModelPrefs() || {};
  p.textModels = list;
  saveModelPrefs(p);
}

// ─────────────────────────────────────────────
// FETCH MODELS FROM OPENROUTER (Auto-fetch với giá live)
// ─────────────────────────────────────────────

const MODELS_CACHE_KEY = 'nd30_models_v2';
const MODELS_CACHE_TTL = 30 * 60 * 1000; // 30 phút

let cachedAllModels = null;
let cachedModelsTs = 0;

/**
 * Fetch tất cả models từ OpenRouter API (có giá + vision flag).
 * Returns: Array<{ id, name, price, vision, free }>
 */
async function fetchModels() {
  if (cachedAllModels && (Date.now() - cachedModelsTs) < MODELS_CACHE_TTL) {
    return cachedAllModels;
  }

  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return getModelsSync() || null;
    }

    const res = await fetch('/api/models');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi API: ${res.status}`);
    }
    const data = await res.json();
    if (!data.success || !Array.isArray(data.models)) {
      throw new Error(data.error || 'Không nhận được danh sách model hợp lệ');
    }
    cachedAllModels = data.models;
    cachedModelsTs = data.ts || Date.now();
    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ models: cachedAllModels, ts: cachedModelsTs }));
    return cachedAllModels;
  } catch (err) {
    console.warn('fetchModels error:', err);
    const cached = localStorage.getItem(MODELS_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.models) {
          cachedAllModels = parsed.models;
          cachedModelsTs = parsed.ts || 0;
          return cachedAllModels;
        }
      } catch {}
    }
    return null;
  }
}

function getModelsSync() {
  if (cachedAllModels) return cachedAllModels;
  const cached = localStorage.getItem(MODELS_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.models && (Date.now() - (parsed.ts || 0)) < MODELS_CACHE_TTL) {
        cachedAllModels = parsed.models;
        cachedModelsTs = parsed.ts || 0;
        return cachedAllModels;
      }
    } catch {}
  }
  return null;
}

/** Helper: format giá model */
function formatModelPrice(m) {
  if (!m) return '';
  return m.free ? 'Free' : `$${m.price}/M`;
}

// ─────────────────────────────────────────────
// Model Panel UI
// ─────────────────────────────────────────────

/**
 * Render priority list cho cả Vision và Text.
 * @param {string} containerId  - ID của container element
 * @param {'vision'|'text'} modelType - Loại model
 * @param {Array|null} fetchedModels - Danh sách models từ OpenRouter API
 */
function renderModelPriorityList(containerId, modelType, fetchedModels) {
  const container = $(containerId);
  if (!container) return;

  const currentList = modelType === 'vision' ? getVisionModelList() : getTextModelList();
  const setList = modelType === 'vision' ? setVisionModelList : setTextModelList;

  // Lọc models phù hợp từ API: vision chỉ hiện vision-capable, text hiện tất cả
  const relevantModels = (fetchedModels || []).filter(m =>
    modelType === 'vision' ? m.vision : true
  );

  const hint = modelType === 'vision'
    ? 'Chọn model nhận dạng ảnh / PDF để thêm:'
    : 'Chọn model để thêm vào danh sách ưu tiên:';

  let html = `<div class="model-select-section">
    <p class="model-section-hint">${hint}</p>
    <div class="combo-box" id="combo-${containerId}">
      <input type="text" class="combo-input" placeholder="Gõ tên để tìm hoặc chọn model..." autocomplete="off" />
      <input type="hidden" class="combo-value" id="model-select-${containerId}" />
      <div class="combo-dropdown"></div>
    </div>
    <button type="button" class="btn-add-model" data-container="${containerId}">+ Thêm vào danh sách</button>
  </div>`;

  html += `<div class="model-priority-header">Danh sách ưu tiên (thử từ trên xuống):</div>`;
  html += currentList.map((id, i) => {
    const info = (fetchedModels || []).find(m => m.id === id);
    const priceLabel = info ? formatModelPrice(info) : '';
    return `
      <div class="model-priority-item" data-model="${id}">
        <span class="model-priority-num">${i + 1}</span>
        <span class="model-priority-id" title="${id}">${id}</span>
        ${priceLabel ? `<span class="model-badge ${info.free ? 'model-badge-free' : 'model-badge-paid'}">${priceLabel}</span>` : ''}
        <button type="button" class="model-priority-remove" data-remove="${id}" title="Xóa">✕</button>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  // Event: Lọc danh sách model - Custom ComboBox
  const wrapper = container.querySelector(`#combo-${containerId}`);
  const inputEl = wrapper.querySelector('.combo-input');
  const valueEl = wrapper.querySelector('.combo-value');
  const dropdownEl = wrapper.querySelector('.combo-dropdown');

  const renderDropdown = (items) => {
    if (items.length === 0) {
      dropdownEl.innerHTML = `<div class="combo-item" style="color:var(--outline); text-align:center;">Không tìm thấy model</div>`;
      return;
    }
    dropdownEl.innerHTML = items.map(m => `
      <div class="combo-item" data-id="${m.id}" data-name="${m.name}">
        <div class="combo-item-title">
          <span>${m.name}</span>
          <span class="model-badge ${m.free ? 'model-badge-free' : 'model-badge-paid'}">${formatModelPrice(m)}</span>
        </div>
        <div class="combo-item-id">${m.id}</div>
      </div>
    `).join('');

    // Attach click events
    dropdownEl.querySelectorAll('.combo-item').forEach(item => {
      if (item.dataset.id) {
        item.addEventListener('click', () => {
          inputEl.value = item.dataset.name;
          valueEl.value = item.dataset.id;
          dropdownEl.classList.remove('active');
        });
      }
    });
  };

  inputEl.addEventListener('focus', () => {
    dropdownEl.classList.add('active');
    renderDropdown(relevantModels);
  });

  inputEl.addEventListener('input', (e) => {
    dropdownEl.classList.add('active');
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      valueEl.value = "";
      renderDropdown(relevantModels);
      return;
    }
    const filtered = relevantModels.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    valueEl.value = ""; // clear hidden value if typing to enforce valid selection
    renderDropdown(filtered);
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (wrapper && !wrapper.contains(e.target)) {
      dropdownEl.classList.remove('active');
    }
  });

  // Event: xóa model khỏi danh sách
  container.querySelectorAll('.model-priority-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.remove;
      const list = (modelType === 'vision' ? getVisionModelList() : getTextModelList()).filter(m => m !== id);
      if (list.length === 0) { showToast('Phải có ít nhất 1 model', 'error'); return; }
      setList(list);
      refreshAllModelPanels();
    });
  });

  // Event: thêm model vào danh sách
  const addBtn = container.querySelector('.btn-add-model');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const select = container.querySelector(`#model-select-${containerId}`);
      const modelId = select?.value;
      if (!modelId) { showToast('Hãy chọn một model', 'error'); return; }
      const list = modelType === 'vision' ? getVisionModelList() : getTextModelList();
      if (list.includes(modelId)) { showToast('Model đã có trong danh sách', 'error'); return; }
      list.unshift(modelId);
      setList(list);
      refreshAllModelPanels();
      showToast(`Đã thêm: ${modelId}`, 'success');
    });
  }
}

/** Refresh tất cả model panels (gọi sau khi thay đổi danh sách) */
function refreshAllModelPanels() {
  const models = getModelsSync();
  // Vision panel (upload)
  renderModelPriorityList('vision-priority-list', 'vision', models);
  // Text panels (upload + text input)
  renderModelPriorityList('text-priority-list-upload', 'text', models);
  renderModelPriorityList('text-priority-list-text', 'text', models);
  updateModelPanelSummary('upload');
  updateModelPanelSummary('text');
}

function updateModelPanelSummary(panelKey) {
  const currentEl = $(`model-current-${panelKey}`);
  if (!currentEl) return;
  if (panelKey === 'upload') {
    const fileType = state.selectedFile ? detectFileType(state.selectedFile.name) : '';
    if (fileType === 'pdf' || fileType === 'image') {
      const list = getVisionModelList();
      const models = getModelsSync();
      const info = models?.find(m => m.id === list[0]);
      currentEl.textContent = info ? info.name : list[0];
    } else {
      const list = getTextModelList();
      currentEl.textContent = list.length === 1 ? list[0] : `${list[0]} +${list.length - 1}`;
    }
  } else {
    const list = getTextModelList();
    currentEl.textContent = list.length === 1 ? list[0] : `${list[0]} +${list.length - 1}`;
  }
}

function showUploadModelPanel(fileType, fetchedModels = null) {
  const panel = $('model-panel-upload');
  if (!panel) return;

  const isVision = fileType === 'pdf' || fileType === 'image';
  $('model-vision-list')?.classList.toggle('hidden', !isVision);
  $('model-text-list-upload')?.classList.toggle('hidden', isVision);

  if (isVision) {
    renderModelPriorityList('vision-priority-list', 'vision', fetchedModels);
  } else {
    renderModelPriorityList('text-priority-list-upload', 'text', fetchedModels);
  }
  updateModelPanelSummary('upload');
  panel.classList.remove('hidden');
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
      body: JSON.stringify({ images, modelList: getVisionModelList() }),
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
    showToast(`Lỗi kết nối AI: ${err.message}`, 'error');
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
    showToast(`Lỗi kết nối AI: ${err.message}`, 'error');
    return null;
  }
}

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════

const STANDARD_KEY = 'vbformatter_standard';

function loadStandard() {
  return localStorage.getItem(STANDARD_KEY) || 'nd30';
}

function saveStandard(std) {
  localStorage.setItem(STANDARD_KEY, std);
}

const state = {
  currentView: 'home',
  standard: loadStandard(),  // 'nd30' | 'hd36'
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

async function handleFileSelected(file) {
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

  // Show model selector with models from API (auto-fetch với giá live)
  const allModels = getModelsSync() || (await fetchModels());
  showUploadModelPanel(fileType, allModels);
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

      // Gọi AI text model phân tích
      if (extractedText && extractedText.trim().length > 20) {
        showOcrStep(true);
        setStep('step-ocr', 'active');
        setProcessingStatus('Đang phân tích nội dung DOCX bằng AI...');
        const aiResult = await tryTextAI(extractedText);
        if (!aiResult) {
          throw new Error('Model AI không phản hồi. Vui lòng thử lại hoặc chọn model khác.');
        }
        setStep('step-ocr', 'done');
        setStep('step-analyze', 'done');
        state.parsedData = aiResult.structuredData;
        populateReviewForm(state.parsedData);
        navigateTo('review');
        showToast('Phân tích AI hoàn tất. Vui lòng kiểm tra kết quả.', 'success');
        return;
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
      if (!backendResult) {
        throw new Error('Model AI không phản hồi. Vui lòng thử lại hoặc chọn model khác.');
      }
      setStep('step-ocr', 'done');
      setStep('step-analyze', 'done');
      state.parsedData = backendResult.structuredData;
      populateReviewForm(state.parsedData);
      navigateTo('review');
      showToast('Phân tích hoàn tất. Vui lòng kiểm tra kết quả.', 'success');
      return;

    } else if (isImage) {
      setStep('step-parse', 'done');
      setStep('step-ocr', 'active');
      setProcessingStatus('Đang nhận dạng ảnh (OpenRouter AI)...');

      const backendResult = await tryBackendOCR(state.selectedFileBuffer, state.selectedFile.name);
      if (!backendResult) {
        throw new Error('Model AI không phản hồi. Vui lòng thử lại hoặc chọn model khác.');
      }
      setStep('step-ocr', 'done');
      setStep('step-analyze', 'done');
      state.parsedData = backendResult.structuredData;
      populateReviewForm(state.parsedData);
      navigateTo('review');
      showToast('Phân tích hoàn tất. Vui lòng kiểm tra kết quả.', 'success');
      return;
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
    if (!aiResult) {
      throw new Error('Model AI không phản hồi. Vui lòng thử lại hoặc chọn model khác.');
    }
    setStep('step-ocr', 'done');
    setStep('step-analyze', 'done');
    state.parsedData = aiResult.structuredData;
    populateReviewForm(state.parsedData);
    navigateTo('review');
    showToast('Phân tích AI hoàn tất. Vui lòng kiểm tra kết quả.', 'success');

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
  const schema = isHD36Type(loai) ? getHD36Schema(loai) : getSchema(loai);

  // ── Section: Tên loại VB ──
  const secTenLoai = $('section-ten-loai');
  if (secTenLoai) secTenLoai.hidden = schema ? !schema.showTenLoai : false;

  // ── Section: Căn cứ ban hành ──
  const secCanCu = $('section-can-cu');
  if (secCanCu) secCanCu.hidden = schema ? !schema.showCanCu : false;

  // ── Section: Kính gửi ──
  const secKinhGui = $('section-kinh-gui');
  if (secKinhGui) secKinhGui.hidden = schema ? !schema.showKinhGui : false;

  // ── Section: Chức danh ban hành ──
  const secChucDanh = $('section-chuc-danh-ban-hanh');
  if (secChucDanh) secChucDanh.hidden = schema ? !schema.showChucDanhBanHanh : false;

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
    const isHD36 = isHD36Type(data.loai_van_ban) || state.standard === 'hd36';
    const filename = isHD36
      ? await downloadHD36Docx(data)
      : await downloadND30Docx(data);
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
    // HD36
    'D_NQ': 'Nghị quyết (Đảng)', 'D_CT': 'Chỉ thị (Đảng)', 'D_KL': 'Kết luận',
    'D_QD': 'Quyết định (Đảng)', 'D_QDI': 'Quy định', 'D_QC': 'Quy chế',
    'D_BC': 'Báo cáo (Đảng)', 'D_TTR': 'Tờ trình (Đảng)', 'D_TB': 'Thông báo (Đảng)',
    'D_HD': 'Hướng dẫn (Đảng)', 'D_CTR': 'Chương trình', 'D_TT': 'Thông tri',
    'D_CV': 'Công văn (Đảng)', 'D_BB': 'Biên bản (Đảng)',
  };

  const isHD36Doc = isHD36Type(data.loai_van_ban) || state.standard === 'hd36';
  $('result-type').textContent = typeMap[data.loai_van_ban?.toUpperCase()] || typeMap[data.loai_van_ban] || data.ten_loai_vb || data.loai_van_ban || '—';
  $('result-org').textContent = data.co_quan_ban_hanh || '—';
  $('result-number').textContent = data.so && data.ky_hieu ? `${data.so}/${data.ky_hieu}` : (data.so_ky_hieu || '—');
  $('result-summary').textContent = data.trich_yeu || '—';
  const subtitleEl = $('result-subtitle');
  if (subtitleEl) subtitleEl.textContent = isHD36Doc
    ? 'File DOCX đã được tạo đúng thể thức HD36 (Văn bản Đảng)'
    : 'File DOCX đã được tạo đúng thể thức NĐ30 (Hành chính)';

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
      const isHD36 = isHD36Type(state.parsedData.loai_van_ban) || state.standard === 'hd36';
      if (isHD36) downloadHD36Docx(state.parsedData);
      else downloadND30Docx(state.parsedData);
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

  // Model panel toggles
  setupModelPanelToggle('upload');
  setupModelPanelToggle('text');
  // Render text panel for text view on load
  const modelsInit = getModelsSync();
  renderModelPriorityList('text-priority-list-text', 'text', modelsInit);
  updateModelPanelSummary('text');

  // ── Standard Selector (NĐ30 / HD36) ──
  $$('.standard-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const std = btn.dataset.standard;
      state.standard = std;
      saveStandard(std);
      $$('.standard-btn').forEach(b => b.classList.toggle('active', b.dataset.standard === std));
    });
  });
  // Restore saved standard on load
  $$('.standard-btn').forEach(b => b.classList.toggle('active', b.dataset.standard === state.standard));

  // ── Guide Tabs ──
  $$('.guide-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const guide = tab.dataset.guide;
      $$('.guide-tab').forEach(t => t.classList.toggle('active', t.dataset.guide === guide));
      $('guide-nd30')?.classList.toggle('hidden', guide !== 'nd30');
      $('guide-hd36')?.classList.toggle('hidden', guide !== 'hd36');
    });
  });
}


// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

async function init() {
  setupDropZone();
  setupTextInput();
  initEventListeners();

  // Pre-fetch models từ OpenRouter in background (non-blocking)
  fetchModels().then(() => {
    // Refresh panels sau khi fetch xong (nếu đã render trước đó với cache cũ)
    refreshAllModelPanels();
  }).catch(() => {});

  navigateTo('home');

  console.log('📄 VBFormatter initialized — NĐ30 + HD36');
}

// Start
document.addEventListener('DOMContentLoaded', init);
