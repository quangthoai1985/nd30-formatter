/**
 * ND30 Formatter — Main Application (Zero-Cost Edition)
 * SPA controller: routing, UI state, event handling
 * 100% client-side — không cần backend
 */

import './style.css';
import { parseDocx, parsePdf, detectFileType, getMimeType } from './parsers.js';
import { parseVBHC, contentItemsToText, textToContentItems } from './rule-parser.js';
import { downloadND30Docx } from './nd30-docx.js';

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
    let isScannedPdf = false;

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

    } else if (fileType === 'pdf') {
      // Try text extraction first
      const { text, isScanned } = await parsePdf(state.selectedFileBuffer);
      setStep('step-parse', 'done');

      if (isScanned) {
        isScannedPdf = true;
        showOcrStep(true);

        // OCR scanned PDF
        setStep('step-ocr', 'active');
        setProcessingStatus('OCR đang đọc PDF scan...');

        const { ocrPdfPages } = await import('./ocr-engine.js');
        extractedText = await ocrPdfPages(state.selectedFileBuffer, (pct) => {
          setProcessingStatus(`OCR đang đọc PDF scan... ${pct}%`);
        });
        setStep('step-ocr', 'done');
      } else {
        extractedText = text;
      }

    } else if (isImage) {
      setStep('step-parse', 'done');

      // OCR image
      setStep('step-ocr', 'active');
      setProcessingStatus('OCR đang đọc ảnh (tiếng Việt)...');

      const { ocrImage } = await import('./ocr-engine.js');
      const blob = new Blob([state.selectedFileBuffer]);
      extractedText = await ocrImage(blob, (pct) => {
        setProcessingStatus(`OCR đang đọc ảnh... ${pct}%`);
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
    showOcrStep(false);

    // Step 1: Read done immediately (text already available)
    setStep('step-parse', 'done');

    // Step 2: Rule-based parsing
    setStep('step-analyze', 'active');
    setProcessingStatus('Đang phân tích cấu trúc văn bản...');

    // Small delay to show processing animation
    await new Promise(r => setTimeout(r, 300));

    const structuredData = parseVBHC(text);
    setStep('step-analyze', 'done');

    // Show review form
    state.parsedData = structuredData;
    populateReviewForm(structuredData);
    navigateTo('review');
    showToast('Phân tích hoàn tất. Vui lòng kiểm tra kết quả.', 'success');

  } catch (error) {
    console.error('Process text error:', error);
    showError(error.message);
  } finally {
    state.isProcessing = false;
    resetSteps();
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
// CREATE DOCX FROM REVIEW
// ═══════════════════════════════════════════

async function createDocxFromReview() {
  try {
    const data = collectReviewData();
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

  // Sync nội dung textarea with preview (live re-render on input)
  $('review-noi-dung-raw')?.addEventListener('input', () => {
    const text = getVal('review-noi-dung-raw');
    const items = textToContentItems(text);
    renderNoiDungPreview(items);
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

  console.log('🏛️ ND30 Formatter initialized (Zero-Cost Edition)');
}

// Start
document.addEventListener('DOMContentLoaded', init);
