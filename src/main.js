/**
 * ND30 Formatter — Main Application
 * SPA controller: routing, UI state, event handling
 */

import './style.css';
import { parseDocx, parsePdf, detectFileType, getMimeType } from './parsers.js';
import { processDocument, arrayBufferToBase64 } from './api-client.js';
import { downloadND30Docx } from './nd30-docx.js';

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════

const state = {
  currentView: 'home',
  selectedFile: null,
  selectedFileBuffer: null,
  processedData: null,
  isProcessing: false,
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
}

function clearSelectedFile() {
  state.selectedFile = null;
  state.selectedFileBuffer = null;
  $('file-input').value = '';
  $('file-info')?.classList.add('hidden');
  $('btn-process-file')?.classList.add('hidden');
  $('btn-process-file').disabled = true;
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
// PROCESS FILE (Flow 1 & 2)
// ═══════════════════════════════════════════

async function processFile() {
  if (!state.selectedFile || !state.selectedFileBuffer) return;
  if (state.isProcessing) return;

  state.isProcessing = true;
  navigateTo('processing');

  try {
    const fileType = detectFileType(state.selectedFile.name);
    let payload;

    // Step 1: Parse file (client-side)
    setStep('step-parse', 'active');
    setProcessingStatus('Đang đọc nội dung file...');

    if (fileType === 'docx') {
      // Parse DOCX client-side
      const { text, html } = await parseDocx(state.selectedFileBuffer);
      setStep('step-parse', 'done');

      payload = { type: 'docx', text, html };

    } else if (fileType === 'pdf') {
      // Try text extraction first
      const { text, isScanned } = await parsePdf(state.selectedFileBuffer);
      setStep('step-parse', 'done');

      if (isScanned) {
        // Scanned PDF → send raw for Gemini Vision
        const base64 = arrayBufferToBase64(state.selectedFileBuffer);
        payload = {
          type: 'vision',
          file_base64: base64,
          mime_type: 'application/pdf',
        };
      } else {
        payload = { type: 'pdf', text };
      }

    } else if (fileType === 'image') {
      setStep('step-parse', 'done');
      // Image → send raw for Gemini Vision
      const base64 = arrayBufferToBase64(state.selectedFileBuffer);
      payload = {
        type: 'vision',
        file_base64: base64,
        mime_type: getMimeType(state.selectedFile.name),
      };
    }

    // Step 2: AI Analysis
    setStep('step-ai', 'active');
    setProcessingStatus('AI đang phân tích thể thức văn bản...');

    const structuredData = await processDocument(payload);
    setStep('step-ai', 'done');

    // Step 3: Generate DOCX
    setStep('step-generate', 'active');
    setProcessingStatus('Đang tạo file DOCX chuẩn ND30...');

    state.processedData = structuredData;
    const filename = await downloadND30Docx(structuredData);
    setStep('step-generate', 'done');

    // Show result
    showResult(structuredData, filename);

  } catch (error) {
    console.error('Process file error:', error);
    showError(error.message);
  } finally {
    state.isProcessing = false;
    resetSteps();
  }
}


// ═══════════════════════════════════════════
// PROCESS TEXT (Flow 3)
// ═══════════════════════════════════════════

async function processText() {
  const textarea = $('text-input');
  const text = textarea?.value?.trim();
  if (!text || text.length < 20) return;
  if (state.isProcessing) return;

  state.isProcessing = true;
  navigateTo('processing');

  try {
    // Step 1: Parse (instant for text)
    setStep('step-parse', 'done');

    // Step 2: AI Analysis
    setStep('step-ai', 'active');
    setProcessingStatus('AI đang phân tích thể thức văn bản...');

    const structuredData = await processDocument({ type: 'text', text });
    setStep('step-ai', 'done');

    // Step 3: Generate DOCX
    setStep('step-generate', 'active');
    setProcessingStatus('Đang tạo file DOCX chuẩn ND30...');

    state.processedData = structuredData;
    const filename = await downloadND30Docx(structuredData);
    setStep('step-generate', 'done');

    // Show result
    showResult(structuredData, filename);

  } catch (error) {
    console.error('Process text error:', error);
    showError(error.message);
  } finally {
    state.isProcessing = false;
    resetSteps();
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
  ['step-parse', 'step-ai', 'step-generate'].forEach(id => setStep(id, null));
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

  // Download again
  $('btn-download')?.addEventListener('click', () => {
    if (state.processedData) {
      downloadND30Docx(state.processedData);
    }
  });

  // New document
  $('btn-new')?.addEventListener('click', () => {
    clearSelectedFile();
    state.processedData = null;
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
}


// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

function init() {
  setupDropZone();
  setupTextInput();
  initEventListeners();
  navigateTo('home');

  console.log('🏛️ ND30 Formatter initialized');
}

// Start
document.addEventListener('DOMContentLoaded', init);
