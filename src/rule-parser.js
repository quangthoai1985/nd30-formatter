/**
 * Rule-based Parser — Phân tích văn bản hành chính Việt Nam
 * Thay thế Gemini AI, chạy 100% client-side
 * Sử dụng regex + pattern matching để trích xuất cấu trúc
 */

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

const VB_TYPE_MAP = {
  'QUYẾT ĐỊNH': 'QD',
  'NGHỊ QUYẾT': 'NQ',
  'THÔNG BÁO': 'TB',
  'TỜ TRÌNH': 'TTR',
  'BÁO CÁO': 'BC',
  'KẾ HOẠCH': 'KH',
  'CHỈ THỊ': 'CT',
  'HƯỚNG DẪN': 'HD',
  'BIÊN BẢN': 'BB',
  'CÔNG VĂN': 'CV',
};

// Regex patterns cho các thành phần văn bản hành chính
const RE = {
  QUOC_HIEU: /CỘNG\s*HÒA\s*XÃ\s*HỘI\s*CHỦ\s*NGHĨA\s*VIỆT\s*NAM/i,
  TIEU_NGU: /Độc\s*lập\s*[-–—]\s*Tự\s*do\s*[-–—]\s*Hạnh\s*phúc/i,
  SO_KY_HIEU: /Số\s*:\s*(\d+)\s*\/\s*([^\n;]+)/i,
  DIA_DANH_NGAY: /([^,\n]{2,30}?),\s*ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i,
  TEN_LOAI: /^\s*(QUYẾT\s*ĐỊNH|NGHỊ\s*QUYẾT|THÔNG\s*BÁO|TỜ\s*TRÌNH|BÁO\s*CÁO|KẾ\s*HOẠCH|CHỈ\s*THỊ|HƯỚNG\s*DẪN|BIÊN\s*BẢN)\s*$/m,
  TRICH_YEU_VV: /(?:Về\s*việc|V\/v)\s*[:\s]*(.+)/i,
  CAN_CU_START: /^\s*Căn\s*cứ\s/mi,
  KINH_GUI: /^\s*Kính\s*gửi\s*:\s*/mi,
  DIEU: /^\s*Điều\s+(\d+)\.\s*(.*)/,
  KHOAN: /^\s*(\d{1,2})\.\s+(.*)/,
  DIEM: /^\s*([a-zđ])\)\s+(.*)/,
  MUC_LON: /^\s*(Chương|Mục|Phần)\s+([IVXLCDM\d]+)[.:\s]\s*(.*)/i,
  QUYEN_HAN: /^\s*(TM\.|KT\.|TUQ\.|TL\.)\s*(.+)/i,
  NOI_NHAN: /Nơi\s*nhận\s*:/i,
  KET_THUC: /\.\s*\/\s*\./,
  QD_COLON: /^\s*QUYẾT\s*ĐỊNH\s*:\s*$/m,
};


// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

/**
 * Normalize text — clean up common formatting issues
 */
function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {3,}/g, '  ')         // 3+ spaces → 2 spaces (preserve some layout)
    .replace(/\n{4,}/g, '\n\n\n')    // Max 3 consecutive newlines
    .trim();
}

/**
 * Check if a string is mostly uppercase Vietnamese
 */
function isUpperCase(str) {
  const letters = str.replace(/[^a-zA-ZĐđÀ-ỹ]/g, '');
  if (letters.length < 2) return false;
  const upper = letters.replace(/[^A-ZĐÀÁẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ]/g, '');
  return upper.length / letters.length > 0.6;
}

/**
 * Search pattern in text, returns { index, match } or null
 */
function findPattern(text, pattern) {
  const m = text.match(pattern);
  if (!m) return null;
  return { index: m.index, match: m };
}

/**
 * Find line number (0-based) containing a text index
 */
function getLineAt(lines, textIndex, text) {
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    if (pos + lines[i].length >= textIndex) return i;
    pos += lines[i].length + 1; // +1 for \n
  }
  return lines.length - 1;
}


// ═══════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════

/**
 * Phân tích văn bản hành chính thành JSON có cấu trúc
 * @param {string} rawText - Text thô (từ DOCX/PDF/OCR/paste)
 * @returns {Object} - JSON cấu trúc theo schema ND30
 */
export function parseVBHC(rawText) {
  const text = normalizeText(rawText);
  const lines = text.split('\n');

  // Result object matching existing DOCX generator schema
  const result = {
    loai_van_ban: '',
    co_quan_chu_quan: '',
    co_quan_ban_hanh: '',
    so: '',
    ky_hieu: '',
    dia_danh: '',
    ngay: '',
    thang: '',
    nam: '',
    ten_loai_vb: '',
    trich_yeu: '',
    can_cu: [],
    kinh_gui: [],
    noi_dung: [],
    quyen_han_ky: '',
    chuc_vu_ky: '',
    ho_ten_ky: '',
    noi_nhan: [],
  };

  // ── Step 1: Find all landmarks ──
  const landmarks = {};

  const qhMatch = findPattern(text, RE.QUOC_HIEU);
  if (qhMatch) landmarks.quocHieu = qhMatch;

  const tnMatch = findPattern(text, RE.TIEU_NGU);
  if (tnMatch) landmarks.tieuNgu = tnMatch;

  const skhMatch = findPattern(text, RE.SO_KY_HIEU);
  if (skhMatch) {
    landmarks.soKyHieu = skhMatch;
    result.so = skhMatch.match[1].trim();
    result.ky_hieu = skhMatch.match[2].trim();
  }

  const ddnMatch = findPattern(text, RE.DIA_DANH_NGAY);
  if (ddnMatch) {
    landmarks.diaDanhNgay = ddnMatch;
    result.dia_danh = ddnMatch.match[1].trim();
    result.ngay = String(parseInt(ddnMatch.match[2])).padStart(2, '0');
    result.thang = String(parseInt(ddnMatch.match[3])).padStart(2, '0');
    result.nam = ddnMatch.match[4];
  }

  const tlMatch = findPattern(text, RE.TEN_LOAI);
  if (tlMatch) {
    landmarks.tenLoaiVB = tlMatch;
    const tenLoaiRaw = tlMatch.match[1].trim().replace(/\s+/g, ' ');
    result.ten_loai_vb = tenLoaiRaw;

    for (const [key, code] of Object.entries(VB_TYPE_MAP)) {
      if (tenLoaiRaw.toUpperCase().replace(/\s+/g, ' ') === key) {
        result.loai_van_ban = code;
        break;
      }
    }
  }

  const ktMatch = findPattern(text, RE.KET_THUC);
  if (ktMatch) landmarks.ketThuc = ktMatch;

  const nnMatch = findPattern(text, RE.NOI_NHAN);
  if (nnMatch) landmarks.noiNhan = nnMatch;

  const qdColonMatch = findPattern(text, RE.QD_COLON);
  if (qdColonMatch) landmarks.qdColon = qdColonMatch;

  // ── Step 2: Extract cơ quan ban hành ──
  _extractOrganizations(text, landmarks, result);

  // ── Step 3: Extract trích yếu ──
  _extractTrichYeu(text, landmarks, result);

  // ── Step 4: Extract căn cứ ──
  _extractCanCu(text, landmarks, result);

  // ── Step 5: Extract kính gửi ──
  _extractKinhGui(text, landmarks, result);

  // ── Step 6: Extract nội dung ──
  _extractNoiDung(text, landmarks, result);

  // ── Step 7: Extract ký tên ──
  _extractSignature(text, landmarks, result);

  // ── Step 8: Extract nơi nhận ──
  _extractNoiNhanList(text, landmarks, result);

  // ── Step 9: Infer document type if not detected ──
  if (!result.loai_van_ban) {
    result.loai_van_ban = _inferDocType(result);
  }

  // ── Step 10: Clean up ──
  _cleanResult(result);

  return result;
}


// ═══════════════════════════════════════════════════
// EXTRACTION FUNCTIONS (Private)
// ═══════════════════════════════════════════════════

/**
 * Extract cơ quan chủ quản và cơ quan ban hành
 */
function _extractOrganizations(text, landmarks, result) {
  // Determine header end: before Số ký hiệu or tên loại VB
  const headerEndIndex = Math.min(
    landmarks.soKyHieu?.index ?? text.length,
    landmarks.tenLoaiVB?.index ?? text.length,
    landmarks.diaDanhNgay?.index ?? text.length,
  );

  const headerText = text.substring(0, headerEndIndex);
  const headerLines = headerText.split('\n').map(l => l.trim()).filter(l => l.length > 2);

  const orgLines = [];
  for (const line of headerLines) {
    // Skip known patterns
    if (RE.QUOC_HIEU.test(line)) continue;
    if (RE.TIEU_NGU.test(line)) continue;
    if (/^[-_─═•·]+$/.test(line)) continue;
    if (RE.SO_KY_HIEU.test(line)) continue;
    if (RE.DIA_DANH_NGAY.test(line)) continue;
    if (/^Số\s*:/i.test(line)) continue;

    // Check uppercase (potential org name)
    if (isUpperCase(line) && line.length > 3) {
      orgLines.push(line);
    }
  }

  if (orgLines.length >= 2) {
    // First = chủ quản, Last = ban hành
    result.co_quan_chu_quan = orgLines[0];
    result.co_quan_ban_hanh = orgLines[orgLines.length - 1];
  } else if (orgLines.length === 1) {
    result.co_quan_ban_hanh = orgLines[0];
  }
}

/**
 * Extract trích yếu nội dung
 */
function _extractTrichYeu(text, landmarks, result) {
  // Pattern 1: "Về việc ..." or "V/v ..."
  const vvMatch = text.match(RE.TRICH_YEU_VV);
  if (vvMatch) {
    let trichYeu = vvMatch[1].trim();

    // Check for continuation lines
    const startIdx = vvMatch.index + vvMatch[0].length;
    const afterText = text.substring(startIdx);
    const endMatch = afterText.match(/\n\s*\n|\n\s*Căn\s*cứ|\n\s*Kính\s*gửi|\n\s*Điều\s+\d|\n\s*QUYẾT\s*ĐỊNH\s*:/i);
    if (endMatch) {
      const continuation = afterText.substring(0, endMatch.index).trim();
      if (continuation) {
        trichYeu += ' ' + continuation.replace(/\n\s*/g, ' ');
      }
    }

    result.trich_yeu = trichYeu.replace(/\s+/g, ' ').trim();
    return;
  }

  // Pattern 2: Lines after tên loại VB (for QĐ, NQ, TB, etc.)
  if (landmarks.tenLoaiVB) {
    const afterTL = text.substring(
      landmarks.tenLoaiVB.index + landmarks.tenLoaiVB.match[0].length
    );
    const lines = afterTL.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const trichYeuLines = [];
    for (const line of lines) {
      if (/^[-_─═]+$/.test(line)) continue; // skip separators
      if (RE.CAN_CU_START.test(line)) break;
      if (RE.KINH_GUI.test(line)) break;
      if (RE.QD_COLON.test(line)) break;
      if (RE.DIEU.test(line)) break;
      trichYeuLines.push(line);
      if (trichYeuLines.length >= 3) break;
    }

    if (trichYeuLines.length > 0) {
      result.trich_yeu = trichYeuLines.join(' ').replace(/\s+/g, ' ').trim();
    }
  }
}

/**
 * Extract danh sách căn cứ ban hành
 */
function _extractCanCu(text, landmarks, result) {
  // Find the first "Căn cứ" line
  const canCuFirstMatch = text.match(RE.CAN_CU_START);
  if (!canCuFirstMatch) return;

  const startIdx = canCuFirstMatch.index;

  // Find end of căn cứ section
  const afterCanCu = text.substring(startIdx);
  const endMatch = afterCanCu.match(/\n\s*\n\s*(?!Căn\s*cứ)(?![-\s])|\n\s*QUYẾT\s*ĐỊNH\s*:|\n\s*Điều\s+\d|\n\s*Kính\s*gửi/i);
  const canCuBlock = endMatch
    ? afterCanCu.substring(0, endMatch.index)
    : afterCanCu.substring(0, 2000); // safety limit

  // Split by semicolons at end of lines, or by "Căn cứ" keyword
  const rawItems = canCuBlock.split(/;\s*\n/);
  const items = [];

  for (const rawItem of rawItems) {
    let cleaned = rawItem.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove trailing period or semicolon
    cleaned = cleaned.replace(/[;.]$/, '').trim();

    if (cleaned.length > 5) {
      items.push(cleaned);
    }
  }

  result.can_cu = items;
}

/**
 * Extract danh sách kính gửi
 */
function _extractKinhGui(text, landmarks, result) {
  const kgMatch = text.match(RE.KINH_GUI);
  if (!kgMatch) return;

  const startIdx = kgMatch.index + kgMatch[0].length;
  const afterKG = text.substring(startIdx);

  // Find end: double newline followed by non-list content
  const endMatch = afterKG.match(/\n\s*\n\s*(?![-–])/);
  const kgBlock = endMatch
    ? afterKG.substring(0, endMatch.index)
    : afterKG.substring(0, 500);

  const lines = kgBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    let cleaned = line.replace(/^[-–]\s*/, '').trim();
    cleaned = cleaned.replace(/[;.]$/, '').trim();
    if (cleaned.length > 0) {
      result.kinh_gui.push(cleaned);
    }
  }
}

/**
 * Extract nội dung văn bản (điều, khoản, điểm, đoạn)
 */
function _extractNoiDung(text, landmarks, result) {
  // ── Determine content boundaries ──
  let contentStart = 0;

  // Priority 1: After "QUYẾT ĐỊNH:" for QĐ
  if (landmarks.qdColon) {
    contentStart = landmarks.qdColon.index + landmarks.qdColon.match[0].length;
  }
  // Priority 2: After kính gửi block
  else if (result.kinh_gui.length > 0) {
    const kgMatch = text.match(RE.KINH_GUI);
    if (kgMatch) {
      const afterKG = text.substring(kgMatch.index);
      const blockEnd = afterKG.match(/\n\s*\n\s*(?![-–])/);
      contentStart = kgMatch.index + (blockEnd ? blockEnd.index + blockEnd[0].length : kgMatch[0].length);
    }
  }
  // Priority 3: After căn cứ section
  else if (result.can_cu.length > 0) {
    const lastCC = result.can_cu[result.can_cu.length - 1];
    const snippet = lastCC.substring(0, Math.min(30, lastCC.length));
    const idx = text.indexOf(snippet);
    if (idx >= 0) {
      const lineEnd = text.indexOf('\n', idx + snippet.length);
      contentStart = lineEnd >= 0 ? lineEnd + 1 : idx + lastCC.length;
    }
  }
  // Priority 4: After tên loại VB + trích yếu
  else if (landmarks.tenLoaiVB) {
    // Skip past trích yếu
    const afterTL = text.substring(landmarks.tenLoaiVB.index + landmarks.tenLoaiVB.match[0].length);
    // Find first content-like pattern
    const contentMatch = afterTL.match(/\n\s*\n/);
    if (contentMatch) {
      contentStart = landmarks.tenLoaiVB.index + landmarks.tenLoaiVB.match[0].length + contentMatch.index + contentMatch[0].length;
    }
  }
  // Priority 5: After địa danh (fallback)
  else if (landmarks.diaDanhNgay) {
    const afterDD = text.indexOf('\n', landmarks.diaDanhNgay.index + landmarks.diaDanhNgay.match[0].length);
    if (afterDD >= 0) contentStart = afterDD + 1;
  }

  // ── Determine content end ──
  let contentEnd = text.length;

  // Before "./"
  if (landmarks.ketThuc) {
    contentEnd = landmarks.ketThuc.index;
  }

  // Before signature (TM., KT., TUQ., TL.)
  const sigMatch = text.substring(contentStart).match(/\n\s*(TM\.|KT\.|TUQ\.|TL\.)\s/i);
  if (sigMatch) {
    const sigIdx = contentStart + sigMatch.index;
    if (sigIdx < contentEnd) contentEnd = sigIdx;
  }

  // Before "Nơi nhận:" (if no "./" found)
  if (!landmarks.ketThuc && landmarks.noiNhan && landmarks.noiNhan.index < contentEnd) {
    contentEnd = landmarks.noiNhan.index;
  }

  if (contentStart >= contentEnd) return;

  // ── Parse content into items ──
  const contentText = text.substring(contentStart, contentEnd).trim();
  if (!contentText) return;

  const contentLines = contentText.split('\n');
  let currentItem = null;

  for (const rawLine of contentLines) {
    const line = rawLine.trim();

    // Skip empty lines — finalize current item
    if (!line) {
      if (currentItem) {
        result.noi_dung.push(currentItem);
        currentItem = null;
      }
      continue;
    }

    // Skip separators and residual heading
    if (/^[-_─═•·]+$/.test(line)) continue;
    if (/^\s*QUYẾT\s*ĐỊNH\s*:?\s*$/i.test(line)) continue;

    // Match patterns in priority order
    const dieuMatch = line.match(RE.DIEU);
    const mucLonMatch = line.match(RE.MUC_LON);
    const diemMatch = line.match(RE.DIEM);

    // Khoản: only match small numbers (1-99) to avoid false positives
    let khoanMatch = null;
    const khoanTest = line.match(RE.KHOAN);
    if (khoanTest && parseInt(khoanTest[1]) <= 50) {
      khoanMatch = khoanTest;
    }

    if (dieuMatch) {
      if (currentItem) result.noi_dung.push(currentItem);
      currentItem = {
        type: 'dieu',
        so: dieuMatch[1],
        tieu_de: dieuMatch[2].trim() || null,
        text: dieuMatch[2].trim(),
      };
    } else if (mucLonMatch) {
      if (currentItem) result.noi_dung.push(currentItem);
      currentItem = {
        type: 'muc_lon',
        so: null,
        tieu_de: `${mucLonMatch[1]} ${mucLonMatch[2]}. ${mucLonMatch[3]}`.trim(),
        text: mucLonMatch[3].trim(),
      };
    } else if (diemMatch) {
      if (currentItem) result.noi_dung.push(currentItem);
      currentItem = {
        type: 'diem',
        so: diemMatch[1],
        tieu_de: null,
        text: diemMatch[2].trim(),
      };
    } else if (khoanMatch) {
      if (currentItem) result.noi_dung.push(currentItem);
      currentItem = {
        type: 'khoan',
        so: khoanMatch[1],
        tieu_de: null,
        text: khoanMatch[2].trim(),
      };
    } else {
      // Continuation of current item or new paragraph
      if (currentItem) {
        currentItem.text += ' ' + line;
        if (currentItem.tieu_de && currentItem.type === 'dieu') {
          currentItem.tieu_de += ' ' + line;
        }
      } else {
        currentItem = { type: 'doan', so: null, tieu_de: null, text: line };
      }
    }
  }

  // Push last item
  if (currentItem) {
    result.noi_dung.push(currentItem);
  }
}

/**
 * Extract khối ký tên (quyền hạn, chức vụ, họ tên)
 */
function _extractSignature(text, landmarks, result) {
  // Find signature zone start
  let sigStart = null;

  // After "./" marker
  if (landmarks.ketThuc) {
    sigStart = landmarks.ketThuc.index + landmarks.ketThuc.match[0].length;
  }

  // Or find TM./KT./TUQ./TL. directly
  if (!sigStart) {
    const qhMatch = text.match(/\n\s*(TM\.|KT\.|TUQ\.|TL\.)\s/i);
    if (qhMatch) sigStart = qhMatch.index;
  }

  if (sigStart === null) return;

  // Signature zone ends at "Nơi nhận:" or end of text
  const sigEnd = landmarks.noiNhan ? landmarks.noiNhan.index : text.length;
  const sigText = text.substring(sigStart, sigEnd).trim();
  const sigLines = sigText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (sigLines.length === 0) return;

  // Find quyền hạn ký line (TM., KT., TUQ., TL.)
  let qhLineIdx = -1;
  for (let i = 0; i < sigLines.length; i++) {
    if (RE.QUYEN_HAN.test(sigLines[i])) {
      result.quyen_han_ky = sigLines[i].trim();
      qhLineIdx = i;
      break;
    }
  }

  if (qhLineIdx >= 0) {
    // Search for chức vụ ký (uppercase line after quyền hạn)
    for (let i = qhLineIdx + 1; i < sigLines.length; i++) {
      const line = sigLines[i].trim();
      if (/^[-_─═]+$/.test(line)) continue;
      if (isUpperCase(line) && line.length > 2) {
        result.chuc_vu_ky = line;

        // Search for họ tên (non-uppercase, non-separator, after chức vụ)
        for (let j = i + 1; j < sigLines.length; j++) {
          const nameLine = sigLines[j].trim();
          if (!nameLine || /^[-_─═]+$/.test(nameLine)) continue;
          if (RE.NOI_NHAN.test(nameLine)) break;
          if (!isUpperCase(nameLine) && nameLine.length > 3) {
            result.ho_ten_ky = nameLine;
            break;
          }
        }
        break;
      }
    }
  } else {
    // No TM./KT. found — try to find chức vụ and name directly
    // Look for last uppercase line (chức vụ) and last Title Case line (name)
    for (let i = sigLines.length - 1; i >= 0; i--) {
      const line = sigLines[i].trim();
      if (RE.NOI_NHAN.test(line)) continue;
      if (/^[-_─═]+$/.test(line)) continue;
      if (!result.ho_ten_ky && !isUpperCase(line) && line.length > 3) {
        result.ho_ten_ky = line;
      } else if (!result.chuc_vu_ky && isUpperCase(line) && line.length > 2) {
        result.chuc_vu_ky = line;
      }
    }
  }
}

/**
 * Extract danh sách nơi nhận
 */
function _extractNoiNhanList(text, landmarks, result) {
  if (!landmarks.noiNhan) return;

  const startIdx = landmarks.noiNhan.index + landmarks.noiNhan.match[0].length;
  const nnText = text.substring(startIdx).trim();
  const lines = nnText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    let cleaned = line.replace(/^[-–]\s*/, '').trim();
    // Keep trailing punctuation for "Lưu: VT."
    if (cleaned.length > 0) {
      result.noi_nhan.push(cleaned);
    }
  }
}

/**
 * Infer document type từ ký hiệu và nội dung
 */
function _inferDocType(result) {
  // From ký hiệu
  if (result.ky_hieu) {
    const kh = result.ky_hieu.toUpperCase();
    if (kh.includes('QĐ') || kh.includes('QD')) return 'QD';
    if (kh.includes('NQ')) return 'NQ';
    if (kh.includes('TB')) return 'TB';
    if (/TTR|TTr/.test(kh)) return 'TTR';
    if (kh.includes('BC')) return 'BC';
    if (kh.includes('KH')) return 'KH';
    if (kh.includes('CT')) return 'CT';
    if (kh.includes('HD')) return 'HD';
    if (kh.includes('BB')) return 'BB';
    if (kh.includes('CV')) return 'CV';
  }

  // Has kính gửi but no tên loại → likely CV (Công văn)
  if (result.kinh_gui.length > 0 && !result.ten_loai_vb) return 'CV';

  // Has Điều → likely QĐ or NQ
  if (result.noi_dung.some(item => item.type === 'dieu')) return 'QD';

  return '';
}

/**
 * Clean up result values
 */
function _cleanResult(result) {
  // Pad số
  if (result.so && result.so.length === 1) {
    result.so = result.so.padStart(2, '0');
  }

  // Clean whitespace in string fields
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      result[key] = result[key].replace(/\s+/g, ' ').trim();
    }
    if (Array.isArray(result[key])) {
      result[key] = result[key]
        .map(item => {
          if (typeof item === 'string') return item.replace(/\s+/g, ' ').trim();
          if (typeof item === 'object' && item !== null) {
            if (item.text) item.text = item.text.replace(/\s+/g, ' ').trim();
            if (item.tieu_de) item.tieu_de = item.tieu_de.replace(/\s+/g, ' ').trim();
          }
          return item;
        })
        .filter(item => {
          if (typeof item === 'string') return item.length > 0;
          return true;
        });
    }
  }
}


// ═══════════════════════════════════════════════════
// UTILITY EXPORTS (Used by review form)
// ═══════════════════════════════════════════════════

/**
 * Convert nội dung items array → raw text (for editing)
 */
export function contentItemsToText(items) {
  if (!items || items.length === 0) return '';
  return items.map(item => {
    switch (item.type) {
      case 'dieu':
        return `Điều ${item.so}. ${item.tieu_de || item.text || ''}`;
      case 'khoan':
        return `${item.so}. ${item.text || ''}`;
      case 'diem':
        return `${item.so}) ${item.text || ''}`;
      case 'muc_lon':
        return item.tieu_de || item.text || '';
      case 'doan':
      default:
        return item.text || '';
    }
  }).join('\n');
}

/**
 * Convert raw text → nội dung items array (from editing)
 */
export function textToContentItems(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n');
  const items = [];
  let currentItem = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentItem) {
        items.push(currentItem);
        currentItem = null;
      }
      continue;
    }

    const dieuMatch = line.match(RE.DIEU);
    const mucMatch = line.match(RE.MUC_LON);
    const diemMatch = line.match(RE.DIEM);
    const khoanMatch = line.match(RE.KHOAN);

    if (dieuMatch) {
      if (currentItem) items.push(currentItem);
      currentItem = { type: 'dieu', so: dieuMatch[1], tieu_de: dieuMatch[2].trim(), text: dieuMatch[2].trim() };
    } else if (mucMatch) {
      if (currentItem) items.push(currentItem);
      currentItem = { type: 'muc_lon', so: null, tieu_de: `${mucMatch[1]} ${mucMatch[2]}. ${mucMatch[3]}`.trim(), text: mucMatch[3].trim() };
    } else if (diemMatch) {
      if (currentItem) items.push(currentItem);
      currentItem = { type: 'diem', so: diemMatch[1], tieu_de: null, text: diemMatch[2].trim() };
    } else if (khoanMatch && parseInt(khoanMatch[1]) <= 50) {
      if (currentItem) items.push(currentItem);
      currentItem = { type: 'khoan', so: khoanMatch[1], tieu_de: null, text: khoanMatch[2].trim() };
    } else {
      if (currentItem) {
        currentItem.text += ' ' + line;
      } else {
        currentItem = { type: 'doan', so: null, tieu_de: null, text: line };
      }
    }
  }

  if (currentItem) items.push(currentItem);
  return items;
}

/**
 * Detect document type from text (convenience export)
 */
export function detectDocType(text) {
  const result = parseVBHC(text);
  return result.loai_van_ban;
}
