/**
 * HD36 DOCX Generator — Văn bản Đảng pixel-perfect
 * Sử dụng thư viện `docx` (programmatic) thay vì template
 * Tuân thủ Hướng dẫn 36-HD/VPTW ngày 03/4/2018
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, UnderlineType,
  HeadingLevel, TableLayoutType, VerticalAlign,
  SectionType,
} from 'docx';
import { saveAs } from 'file-saver';

// ═══════════════════════════════════════════
// LAYOUT CONSTANTS — HD36 (KHÁC NĐ30)
// ═══════════════════════════════════════════

const FONT = 'Times New Roman';
const PAGE = { width: 11906, height: 16838 }; // A4
const MARGIN = {
  top: 1134,    // 20mm
  bottom: 1134, // 20mm
  left: 1701,   // 30mm
  right: 850,   // 15mm ← KHÁC NĐ30 (1134 = 20mm)
};
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right; // 9355 dxa
const COL_LEFT = 3500;
const COL_RIGHT = CONTENT_WIDTH - COL_LEFT; // 5855

const BODY_SPACING = {
  before: 120,  // 6pt
  after: 120,   // 6pt
  line: 360,    // 18pt EXACT ← KHÁC NĐ30 (340 = 17pt)
};

const INDENT_FIRST = 567; // ~10mm ← KHÁC NĐ30 (~720)

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

// ═══════════════════════════════════════════
// HELPER: TextRun factories
// ═══════════════════════════════════════════

function tr(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size ?? 28, // default cỡ 14
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 0 }, children: [tr('')] });
}

// ═══════════════════════════════════════════
// HEADER TABLE (2 cột ẩn viền)
// ═══════════════════════════════════════════

function buildHeaderTable(data) {
  const leftParagraphs = [];
  const rightParagraphs = [];

  // ── CỘT TRÁI ──

  // Tên CQ cấp trên (nếu có) — cỡ 14, thường, IN HOA, căn giữa
  if (data.co_quan_cap_tren) {
    leftParagraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [tr(data.co_quan_cap_tren.toUpperCase(), { size: 28 })],
    }));
  }

  // Tên CQ ban hành — cỡ 14, ĐẬM, IN HOA, căn giữa
  leftParagraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [tr(data.co_quan_ban_hanh?.toUpperCase() || '', { size: 28, bold: true })],
  }));

  // Dấu sao (*) — KHÁC NĐ30 (gạch ngang 1/3)
  leftParagraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 80 },
    children: [tr('*', { size: 28 })],
  }));

  // Số ký hiệu — cỡ 14, thường, căn giữa
  leftParagraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [tr(data.so_ky_hieu || '', { size: 28 })],
  }));

  // ── CỘT PHẢI ──

  // "ĐẢNG CỘNG SẢN VIỆT NAM" — cỡ 15, ĐẬM, IN HOA, căn giữa
  rightParagraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [tr('ĐẢNG CỘNG SẢN VIỆT NAM', { size: 30, bold: true })],
  }));

  // Gạch dưới (dùng border bottom trên paragraph trước hoặc paragraph riêng)
  rightParagraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1 } },
    children: [tr('')],
  }));

  // Địa danh, ngày tháng năm — cỡ 14, nghiêng, căn giữa
  const ngayStr = String(data.ngay || '').padStart(2, '0');
  const thangStr = String(data.thang || '').padStart(2, '0');
  const diaDanhNgay = `${data.dia_danh || ''}, ngày ${ngayStr} tháng ${thangStr} năm ${data.nam || ''}`;
  rightParagraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 0 },
    children: [tr(diaDanhNgay, { size: 28, italics: true })],
  }));

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: COL_LEFT, type: WidthType.DXA },
            borders: NO_BORDER,
            verticalAlign: VerticalAlign.TOP,
            children: leftParagraphs,
          }),
          new TableCell({
            width: { size: COL_RIGHT, type: WidthType.DXA },
            borders: NO_BORDER,
            verticalAlign: VerticalAlign.TOP,
            children: rightParagraphs,
          }),
        ],
      }),
    ],
  });
}

// ═══════════════════════════════════════════
// TITLE + TRÍCH YẾU
// ═══════════════════════════════════════════

function buildTitle(data) {
  const paragraphs = [];
  const isCV = data.loai_van_ban === 'cong_van' || data.ky_hieu_loai === 'CV';
  const isBB = data.loai_van_ban === 'bien_ban' || data.ky_hieu_loai === 'BB';

  if (!isCV) {
    // Tên loại VB — cỡ 15–16, ĐẬM, IN HOA, căn giữa
    const tenLoai = data.ten_loai_vb || getTenLoaiFromCode(data.ky_hieu_loai || '');
    if (tenLoai) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360, after: 0, line: BODY_SPACING.line },
        children: [tr(tenLoai.toUpperCase(), { size: 32, bold: true })],
      }));
    }

    // Trích yếu VB có tên loại — cỡ 14, ĐẬM, căn giữa
    if (data.trich_yeu) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [tr(data.trich_yeu, { size: 28, bold: true })],
      }));
      // Gạch dưới trích yếu
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, space: 1 } },
        children: [tr('           ', { size: 14 })],
      }));
    }
  } else {
    // Công văn: trích yếu ở header, cỡ 12, nghiêng
    // (Không có tên loại riêng)
    if (data.trich_yeu) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [tr(data.trich_yeu, { size: 24, italics: true })],
      }));
    }
  }

  return paragraphs;
}

function getTenLoaiFromCode(code) {
  const map = {
    'NQ': 'NGHỊ QUYẾT', 'CT': 'CHỈ THỊ', 'KL': 'KẾT LUẬN',
    'QĐ': 'QUYẾT ĐỊNH', 'QĐi': 'QUY ĐỊNH', 'QC': 'QUY CHẾ',
    'BC': 'BÁO CÁO', 'TTr': 'TỜ TRÌNH', 'TB': 'THÔNG BÁO',
    'HD': 'HƯỚNG DẪN', 'CTr': 'CHƯƠNG TRÌNH', 'TT': 'THÔNG TRI',
    'BB': 'BIÊN BẢN',
  };
  return map[code] || '';
}

// ═══════════════════════════════════════════
// CĂN CỨ BAN HÀNH
// ═══════════════════════════════════════════

function buildCanCu(canCuArr) {
  if (!canCuArr || canCuArr.length === 0) return [];

  return canCuArr.map((cc, i) => {
    let text = cc.trim();
    // Bỏ dấu câu cuối để format lại
    text = text.replace(/[;,.]$/, '').trim();
    // Căn cứ cuối: dấu phẩy (,), còn lại: dấu chấm phẩy (;)
    const suffix = i === canCuArr.length - 1 ? ',' : ';';

    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { ...BODY_SPACING },
      indent: { firstLine: INDENT_FIRST },
      children: [
        tr('- ', { size: 28 }),
        tr(text + suffix, { size: 28 }), // Chữ ĐỨNG — KHÁC NĐ30 (nghiêng)
      ],
    });
  });
}

// ═══════════════════════════════════════════
// KÍNH GỬI (Công văn, Tờ trình)
// ═══════════════════════════════════════════

function buildKinhGui(kinhGuiArr) {
  if (!kinhGuiArr || kinhGuiArr.length === 0) return [];

  const paragraphs = [];

  if (kinhGuiArr.length === 1) {
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        tr('Kính gửi: ', { size: 28, italics: true }),
        tr(kinhGuiArr[0], { size: 28, italics: true }),
      ],
    }));
  } else {
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 0 },
      children: [tr('Kính gửi:', { size: 28, italics: true })],
    }));
    kinhGuiArr.forEach((kg, i) => {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [tr(`- ${kg}${i < kinhGuiArr.length - 1 ? ',' : '.'}`, { size: 28, italics: true })],
      }));
    });
  }

  return paragraphs;
}

// ═══════════════════════════════════════════
// NỘI DUNG VĂN BẢN
// ═══════════════════════════════════════════

function buildNoiDung(noiDung) {
  if (!noiDung) return [];

  // Nếu là string, tách theo dòng
  const text = typeof noiDung === 'string' ? noiDung : '';
  if (text) {
    return text.split('\n').filter(l => l.trim()).map(line => {
      const trimmed = line.trim();

      // Điều X. — toàn bộ đậm
      const dieuMatch = trimmed.match(/^(Điều\s+\d+\.?\s*)(.*)/);
      if (dieuMatch) {
        return new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { ...BODY_SPACING },
          indent: { firstLine: INDENT_FIRST },
          children: [tr(trimmed, { size: 28, bold: true })],
        });
      }

      // Chương/Phần/Mục — căn giữa, đậm
      const mucMatch = trimmed.match(/^(Chương|Phần|Mục)\s+[IVXLCDM\d]+/i);
      if (mucMatch) {
        return new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { ...BODY_SPACING },
          children: [tr(trimmed, { size: 28, bold: true })],
        });
      }

      // Tên chương/phần IN HOA — căn giữa, đậm
      if (/^[A-ZĐÀÁẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ\s,]+$/.test(trimmed) && trimmed.length > 3) {
        return new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { ...BODY_SPACING },
          children: [tr(trimmed, { size: 28, bold: true })],
        });
      }

      // Đoạn thường
      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { ...BODY_SPACING },
        indent: { firstLine: INDENT_FIRST },
        children: [tr(trimmed, { size: 28 })],
      });
    });
  }

  // Nếu là array (từ review form)
  if (Array.isArray(noiDung)) {
    return noiDung.map(item => {
      const itemText = typeof item === 'string' ? item : (item.text || '');
      const type = item.type || 'doan';

      if (type === 'dieu') {
        return new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { ...BODY_SPACING },
          indent: { firstLine: INDENT_FIRST },
          children: [tr(`Điều ${item.so}. ${item.tieu_de || itemText}`, { size: 28, bold: true })],
        });
      }

      if (type === 'muc_lon') {
        return new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { ...BODY_SPACING },
          children: [tr(item.tieu_de || itemText, { size: 28, bold: true })],
        });
      }

      if (type === 'khoan') {
        return new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { ...BODY_SPACING },
          indent: { firstLine: INDENT_FIRST },
          children: [tr(`${item.so}. ${itemText}`, { size: 28 })],
        });
      }

      if (type === 'diem') {
        return new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { ...BODY_SPACING },
          indent: { firstLine: INDENT_FIRST },
          children: [tr(`${item.so}) ${itemText}`, { size: 28 })],
        });
      }

      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { ...BODY_SPACING },
        indent: { firstLine: INDENT_FIRST },
        children: [tr(itemText, { size: 28 })],
      });
    });
  }

  return [];
}

// ═══════════════════════════════════════════
// KHỐI CHỮ KÝ + NƠI NHẬN (Table 2 cột)
// ═══════════════════════════════════════════

function buildSignatureTable(data) {
  const isBB = data.loai_van_ban === 'bien_ban' || data.ky_hieu_loai === 'BB';

  // ── Cột phải: Chữ ký ──
  const sigParagraphs = [];

  if (isBB) {
    // Biên bản: 2 chữ ký — xử lý đặc biệt
    return buildBienBanSignature(data);
  }

  // Quyền hạn ký — IN HOA, đậm, cỡ 14
  if (data.quyen_han_ky) {
    sigParagraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 0 },
      children: [tr(data.quyen_han_ky.toUpperCase(), { size: 28, bold: true })],
    }));
  }

  // Chức vụ — IN HOA, thường, cỡ 14
  if (data.chuc_vu_ky) {
    sigParagraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [tr(data.chuc_vu_ky.toUpperCase(), { size: 28 })],
    }));
  }

  // 4 dòng trống cho chữ ký — KHÁC NĐ30 (2-3 dòng)
  for (let i = 0; i < 4; i++) {
    sigParagraphs.push(emptyLine());
  }

  // Họ tên — thường, đậm, cỡ 14
  sigParagraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [tr(data.nguoi_ky || data.ho_ten_ky || '', { size: 28, bold: true })],
  }));

  // ── Cột trái: Nơi nhận ──
  const noiNhanParagraphs = [];

  // "Nơi nhận:" — cỡ 14, gạch chân — KHÁC NĐ30 (đậm + nghiêng)
  noiNhanParagraphs.push(new Paragraph({
    spacing: { before: 240, after: 0 },
    children: [tr('Nơi nhận:', { size: 28, underline: true })],
  }));

  // Danh sách nơi nhận — cỡ 12, thường
  const noiNhanArr = Array.isArray(data.noi_nhan) ? data.noi_nhan : [];
  noiNhanArr.forEach(nn => {
    noiNhanParagraphs.push(new Paragraph({
      spacing: { after: 0 },
      children: [tr(`- ${nn}`, { size: 24 })], // cỡ 12
    }));
  });

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: Math.floor(CONTENT_WIDTH * 0.45), type: WidthType.DXA },
            borders: NO_BORDER,
            verticalAlign: VerticalAlign.TOP,
            children: noiNhanParagraphs.length > 0 ? noiNhanParagraphs : [emptyLine()],
          }),
          new TableCell({
            width: { size: Math.floor(CONTENT_WIDTH * 0.55), type: WidthType.DXA },
            borders: NO_BORDER,
            verticalAlign: VerticalAlign.TOP,
            children: sigParagraphs.length > 0 ? sigParagraphs : [emptyLine()],
          }),
        ],
      }),
    ],
  });
}

function buildBienBanSignature(data) {
  // Biên bản: 2 chữ ký cạnh nhau
  const leftSig = [];
  const rightSig = [];

  // Bên trái: Người ghi biên bản
  leftSig.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 0 },
    children: [tr(data.chuc_vu_trai || 'NGƯỜI GHI BIÊN BẢN', { size: 28, bold: true })],
  }));
  for (let i = 0; i < 4; i++) leftSig.push(emptyLine());
  leftSig.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [tr(data.nguoi_ghi || '', { size: 28, bold: true })],
  }));

  // Bên phải: Chủ trì
  rightSig.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 0 },
    children: [tr(data.chuc_vu_phai || 'CHỦ TRÌ HỘI NGHỊ', { size: 28, bold: true })],
  }));
  for (let i = 0; i < 4; i++) rightSig.push(emptyLine());
  rightSig.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [tr(data.chu_tri || '', { size: 28, bold: true })],
  }));

  const sigTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: Math.floor(CONTENT_WIDTH / 2), type: WidthType.DXA },
            borders: NO_BORDER,
            verticalAlign: VerticalAlign.TOP,
            children: leftSig,
          }),
          new TableCell({
            width: { size: Math.floor(CONTENT_WIDTH / 2), type: WidthType.DXA },
            borders: NO_BORDER,
            verticalAlign: VerticalAlign.TOP,
            children: rightSig,
          }),
        ],
      }),
    ],
  });

  return sigTable;
}

// ═══════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════

/**
 * Chuyển data từ review form (format D_XX) sang format HD36 internal
 */
function normalizeData(data) {
  const d = { ...data };

  // Map từ format review form sang HD36 internal
  if (d.co_quan_chu_quan && !d.co_quan_cap_tren) {
    d.co_quan_cap_tren = d.co_quan_chu_quan;
  }
  if (d.ho_ten_ky && !d.nguoi_ky) {
    d.nguoi_ky = d.ho_ten_ky;
  }

  // Build số ký hiệu theo format HD36: "Số 15-NQ/HU"
  if (!d.so_ky_hieu && d.so && d.ky_hieu) {
    d.so_ky_hieu = `Số ${String(d.so).padStart(2, '0')}-${d.ky_hieu}`;
  }

  // Xác định ky_hieu_loai từ loai_van_ban code
  if (!d.ky_hieu_loai && d.loai_van_ban) {
    const code = d.loai_van_ban.replace('D_', '');
    const codeMap = {
      'NQ': 'NQ', 'CT': 'CT', 'KL': 'KL', 'QD': 'QĐ', 'QDI': 'QĐi',
      'QC': 'QC', 'BC': 'BC', 'TTR': 'TTr', 'TB': 'TB', 'HD': 'HD',
      'CTR': 'CTr', 'TT': 'TT', 'CV': 'CV', 'BB': 'BB',
    };
    d.ky_hieu_loai = codeMap[code] || code;
  }

  return d;
}

export async function generateHD36Docx(rawData) {
  const data = normalizeData(rawData);

  // Build document sections
  const children = [];

  // 1. Header table
  children.push(buildHeaderTable(data));

  // 2. Spacing sau header
  children.push(new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }));

  // 3. Title + Trích yếu
  children.push(...buildTitle(data));

  // 4. Căn cứ ban hành
  if (data.can_cu && data.can_cu.length > 0) {
    children.push(...buildCanCu(data.can_cu));
  }

  // 5. Kính gửi (CV, TTr)
  if (data.kinh_gui) {
    const kgArr = Array.isArray(data.kinh_gui) ? data.kinh_gui : [data.kinh_gui];
    if (kgArr.length > 0 && kgArr[0]) {
      children.push(...buildKinhGui(kgArr));
    }
  }

  // 6. Nội dung
  const noiDungParagraphs = buildNoiDung(data.noi_dung || data.noi_dung_text || '');
  children.push(...noiDungParagraphs);

  // 7. Chữ ký + Nơi nhận
  children.push(buildSignatureTable(data));

  // Build Document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: PAGE,
          margin: MARGIN,
        },
      },
      children,
    }],
  });

  // Pack to blob
  const buffer = await Packer.toBlob(doc);
  return buffer;
}

export async function downloadHD36Docx(data, filename) {
  const blob = await generateHD36Docx(data);

  if (!filename) {
    const so = String(data.so || '00').padStart(2, '0');
    const kh = data.ky_hieu || 'VBD';
    filename = `${so}_${kh}_HD36.docx`.replace(/\//g, '-');
  }

  saveAs(blob, filename);
  return filename;
}
