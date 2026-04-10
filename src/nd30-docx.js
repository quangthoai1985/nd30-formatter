/**
 * ND30 DOCX Generator — Client-side
 * Chuẩn hóa theo Nghị định 30/2020/NĐ-CP (Phụ lục I)
 * Tham chiếu: .Agent/.skill/nd30/SKILL.md + references/
 * Sử dụng npm "docx" package để tạo file .docx trong browser
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageNumber,
  NumberFormat,
  Header,
  SectionType,
  convertMillimetersToTwip,
} from 'docx';

import { saveAs } from 'file-saver';


// ═══════════════════════════════════════════════════
// HẰNG SỐ ND30 (Fix — Nghị định 30/2020/NĐ-CP)
// ═══════════════════════════════════════════════════

const ND30 = {
  FONT: 'Times New Roman',

  // === Cỡ chữ (đơn vị: half-points, nhân 2 so với pt) ===
  // Nhóm 13pt: Quốc hiệu, Tiêu ngữ, CQ, Số KH, Địa danh, Số trang
  SIZE_13: 26,
  // Nhóm 14pt: Tên loại, Trích yếu, Nội dung, Ký tên, Kính gửi, Căn cứ
  SIZE_14: 28,
  // Nhóm 12pt: "Nơi nhận:"
  SIZE_12: 24,
  // Nhóm 11pt: DS nơi nhận
  SIZE_11: 22,
  // V/v Công văn: 12pt
  SIZE_12_CV: 24,

  // === Lề (mm) — FIX ===
  MARGIN_TOP: 20,
  MARGIN_BOTTOM: 20,
  MARGIN_LEFT: 30,
  MARGIN_RIGHT: 15,

  // === Khoảng cách dòng (twips) ===
  LINE_SINGLE: 240,   // 1.0 lines — cho header, CQ, ký tên
  LINE_CONTENT: 312,  // 1.3 lines — cho nội dung (giữa 1.0 và 1.5)

  // === Thụt đầu dòng ===
  FIRST_LINE_INDENT: convertMillimetersToTwip(12.7), // 1.27cm
};

// Viền ẩn (None)
const BORDER_NONE = { style: BorderStyle.NONE, size: 0 };
const noBorder = {
  top: BORDER_NONE, bottom: BORDER_NONE,
  left: BORDER_NONE, right: BORDER_NONE,
};
const noCellBorders = { ...noBorder };


// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Tạo TextRun chuẩn ND30
 */
function textRun(text, { size = ND30.SIZE_14, bold = false, italic = false } = {}) {
  return new TextRun({
    text,
    font: ND30.FONT,
    size,
    bold,
    italic,
    color: '000000',
  });
}

/**
 * Tạo Paragraph chuẩn ND30
 * @param {Array|TextRun} runs
 * @param {Object} opts
 */
function para(runs, {
  alignment = AlignmentType.JUSTIFY,
  spaceBefore = 0,
  spaceAfter = 0,
  indent,
  lineSpacing = ND30.LINE_SINGLE,
  borderBottom,
} = {}) {
  const config = {
    children: Array.isArray(runs) ? runs : [runs],
    alignment,
    spacing: {
      before: spaceBefore,
      after: spaceAfter,
      line: lineSpacing,
    },
  };
  if (indent) {
    config.indent = indent;
  }
  if (borderBottom) {
    config.border = {
      bottom: borderBottom,
    };
  }
  return new Paragraph(config);
}

/**
 * Đường kẻ ngang nét liền (paragraph border bottom)
 * Thay vì dùng ký tự underscore, dùng border chuẩn DOCX.
 *
 * @param {'full'|'short'} type
 *   - 'full': dài bằng dòng chữ (cho Tiêu ngữ) — không indent
 *   - 'short': 1/3–1/2 dòng chữ (cho CQ ban hành, Trích yếu) — indent trái/phải
 */
function separatorLine(type = 'short') {
  // Tính indent trái/phải để tạo đường kẻ ngắn canh giữa
  const printWidth = 210 - ND30.MARGIN_LEFT - ND30.MARGIN_RIGHT; // 165mm
  const lineWidthMm = type === 'full' ? printWidth : Math.round(printWidth * 0.4);
  const sidePadMm = Math.round((printWidth - lineWidthMm) / 2);

  const indent = type === 'short' ? {
    left: convertMillimetersToTwip(sidePadMm),
    right: convertMillimetersToTwip(sidePadMm),
  } : undefined;

  return para(
    textRun('', { size: 2 }), // Empty run, tiny font
    {
      alignment: AlignmentType.CENTER,
      spaceBefore: 0,
      spaceAfter: 60, // ~3pt
      indent,
      borderBottom: {
        style: BorderStyle.SINGLE,
        size: 6, // 0.75pt
        color: '000000',
      },
    }
  );
}


// ═══════════════════════════════════════════════════
// KHỐI HEADER (Ô 1, 2, 3, 4, 5b)
// Bảng 2 cột không viền: Trái ~45% / Phải ~55%
// ═══════════════════════════════════════════════════

function createHeaderBlock(data) {
  const { co_quan_chu_quan, co_quan_ban_hanh, so, ky_hieu, dia_danh, ngay, thang, nam, trich_yeu_cv } = data;

  // === Cột trái: CQ chủ quản + CQ ban hành + Số ký hiệu + V/v ===
  const leftParagraphs = [];

  // Dòng 1: CQ chủ quản (IN HOA, KHÔNG đậm, cỡ 13)
  if (co_quan_chu_quan) {
    leftParagraphs.push(
      para(textRun(co_quan_chu_quan.toUpperCase(), { size: ND30.SIZE_13 }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0,
      })
    );
  }

  // Dòng 2: CQ ban hành (IN HOA, ĐẬM, cỡ 13)
  leftParagraphs.push(
    para(textRun((co_quan_ban_hanh || '').toUpperCase(), { size: ND30.SIZE_13, bold: true }), {
      alignment: AlignmentType.CENTER, spaceAfter: 0,
    })
  );

  // Đường kẻ dưới CQ ban hành: 1/3–1/2 dòng chữ
  leftParagraphs.push(separatorLine('short'));

  // Số ký hiệu (in thường, cỡ 13) — Pad số 0 cho số < 10
  const soPadded = String(so).padStart(2, '0');
  leftParagraphs.push(
    para([
      textRun('Số: ', { size: ND30.SIZE_13 }),
      textRun(`${soPadded}/${ky_hieu || ''}`, { size: ND30.SIZE_13 }),
    ], {
      alignment: AlignmentType.CENTER, spaceBefore: 120, spaceAfter: 0,
    })
  );

  // V/v trích yếu (chỉ cho Công văn — in thường, cỡ 12, đứng)
  if (trich_yeu_cv) {
    leftParagraphs.push(
      para(textRun(`V/v ${trich_yeu_cv}`, { size: ND30.SIZE_12_CV }), {
        alignment: AlignmentType.CENTER, spaceBefore: 60, spaceAfter: 0,
      })
    );
  }

  // === Cột phải: Quốc hiệu + Tiêu ngữ + Địa danh ===
  const ngayStr = String(ngay).padStart(2, '0');
  const thangStr = String(thang).padStart(2, '0');

  const rightParagraphs = [
    // Quốc hiệu (IN HOA, ĐẬM, đứng, cỡ 13)
    para(textRun('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { size: ND30.SIZE_13, bold: true }), {
      alignment: AlignmentType.CENTER, spaceAfter: 0,
    }),
    // Tiêu ngữ (in thường, ĐẬM, đứng — KHÔNG NGHIÊNG, cỡ 13)
    para(textRun('Độc lập - Tự do - Hạnh phúc', { size: ND30.SIZE_13, bold: true }), {
      alignment: AlignmentType.CENTER, spaceAfter: 0,
    }),
    // Đường kẻ dưới Tiêu ngữ: dài bằng dòng chữ
    separatorLine('full'),
    // Địa danh + ngày tháng (in thường, NGHIÊNG, cỡ 13)
    para(textRun(`${dia_danh || ''}, ngày ${ngayStr} tháng ${thangStr} năm ${nam || ''}`, {
      size: ND30.SIZE_13, italic: true,
    }), {
      alignment: AlignmentType.CENTER, spaceBefore: 120, spaceAfter: 0,
    }),
  ];

  // Tỉ lệ cột: ~45% trái / ~55% phải (theo layout-diagram.md)
  const printWidthTwip = convertMillimetersToTwip(165); // 210 - 30 - 15
  const colLeftWidth = Math.round(printWidthTwip * 0.45);
  const colRightWidth = printWidthTwip - colLeftWidth;

  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: leftParagraphs,
            width: { size: colLeftWidth, type: WidthType.DXA },
            borders: noCellBorders,
          }),
          new TableCell({
            children: rightParagraphs,
            width: { size: colRightWidth, type: WidthType.DXA },
            borders: noCellBorders,
          }),
        ],
      }),
    ],
    width: { size: printWidthTwip, type: WidthType.DXA },
    borders: noBorder,
  });
}


// ═══════════════════════════════════════════════════
// KHỐI TÊN LOẠI + TRÍCH YẾU (Ô 5a)
// Chỉ dùng cho VB CÓ tên loại (QĐ, TB, CT, KH...)
// ═══════════════════════════════════════════════════

function createTenLoaiBlock(ten_loai_vb, trich_yeu) {
  const paragraphs = [];

  // Tên loại VB: IN HOA, ĐẬM, đứng, cỡ 14, canh giữa
  paragraphs.push(
    para(textRun((ten_loai_vb || '').toUpperCase(), { size: ND30.SIZE_14, bold: true }), {
      alignment: AlignmentType.CENTER, spaceBefore: 240, spaceAfter: 0,
    })
  );

  // Trích yếu: in thường, ĐẬM, đứng, cỡ 14, canh giữa
  if (trich_yeu) {
    paragraphs.push(
      para(textRun(trich_yeu, { size: ND30.SIZE_14, bold: true }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0,
      })
    );
  }

  // Đường kẻ dưới trích yếu: 1/3–1/2 dòng chữ
  paragraphs.push(separatorLine('short'));

  return paragraphs;
}


// ═══════════════════════════════════════════════════
// KHỐI KÍNH GỬI (Ô 9a)
// Chỉ cho CV, TTr, BC gửi cấp trên
// Cỡ 14, đứng, in thường
// ═══════════════════════════════════════════════════

function createKinhGuiBlock(kinh_gui) {
  if (!kinh_gui || kinh_gui.length === 0) return [];

  const paragraphs = [];
  const indent1cm = ND30.FIRST_LINE_INDENT;

  if (kinh_gui.length === 1) {
    // 1 nơi: "Kính gửi: Tên CQ" cùng dòng
    paragraphs.push(
      para([
        textRun('Kính gửi: ', { size: ND30.SIZE_14 }),
        textRun(kinh_gui[0], { size: ND30.SIZE_14 }),
      ], {
        alignment: AlignmentType.LEFT,
        spaceBefore: 240, spaceAfter: 120,
        indent: { firstLine: indent1cm },
      })
    );
  } else {
    // >= 2 nơi: "Kính gửi:" dòng riêng, danh sách bên dưới
    // Gạch đầu dòng thẳng hàng dưới dấu hai chấm (:)
    // Indent left = khoảng "Kính gửi:" ≈ 2.5cm
    const kinhGuiIndent = convertMillimetersToTwip(25);

    paragraphs.push(
      para(textRun('Kính gửi:', { size: ND30.SIZE_14 }), {
        alignment: AlignmentType.LEFT,
        spaceBefore: 240, spaceAfter: 0,
        indent: { firstLine: indent1cm },
      })
    );
    kinh_gui.forEach((noi, i) => {
      const endChar = i === kinh_gui.length - 1 ? '.' : ';';
      paragraphs.push(
        para(textRun(`- ${noi}${endChar}`, { size: ND30.SIZE_14 }), {
          alignment: AlignmentType.LEFT, spaceAfter: 0,
          indent: { left: kinhGuiIndent },
        })
      );
    });
  }

  return paragraphs;
}


// ═══════════════════════════════════════════════════
// KHỐI CĂN CỨ BAN HÀNH
// In thường, NGHIÊNG, cỡ 14, lùi 1cm
// ═══════════════════════════════════════════════════

function createCanCuBlock(can_cu) {
  if (!can_cu || can_cu.length === 0) return [];

  return can_cu.map((cc, i) => {
    const endChar = i === can_cu.length - 1 ? '.' : ';';
    return para(textRun(`${cc}${endChar}`, { size: ND30.SIZE_14, italic: true }), {
      alignment: AlignmentType.JUSTIFY, spaceAfter: 0,
      lineSpacing: ND30.LINE_CONTENT,
      indent: { firstLine: ND30.FIRST_LINE_INDENT },
    });
  });
}


// ═══════════════════════════════════════════════════
// KHỐI NỘI DUNG (Ô 6)
// In thường, đứng, cỡ 14, justify, lùi 1cm
// Khoảng cách đoạn ≥ 6pt, dòng 1.0–1.5
// ═══════════════════════════════════════════════════

function createContentBlock(noi_dung) {
  if (!noi_dung || noi_dung.length === 0) return [];

  const paragraphs = [];
  const indent1cm = ND30.FIRST_LINE_INDENT;

  for (const item of noi_dung) {
    if (typeof item === 'string') {
      // Plain text paragraph
      paragraphs.push(
        para(textRun(item, { size: ND30.SIZE_14 }), {
          alignment: AlignmentType.JUSTIFY, spaceAfter: 120,
          lineSpacing: ND30.LINE_CONTENT,
          indent: { firstLine: indent1cm },
        })
      );
      continue;
    }

    const { type, so, tieu_de, text } = item;

    switch (type) {
      case 'dieu':
        // Điều: in thường, đứng, ĐẬM, lùi 1cm
        paragraphs.push(
          para(textRun(`Điều ${so}. ${tieu_de || text || ''}`, {
            size: ND30.SIZE_14, bold: true,
          }), {
            alignment: AlignmentType.JUSTIFY,
            spaceBefore: 120, spaceAfter: 120,
            lineSpacing: ND30.LINE_CONTENT,
            indent: { firstLine: indent1cm },
          })
        );
        break;

      case 'khoan':
        // Khoản: in thường, đứng, lùi 1cm
        // Khoản CÓ tiêu đề → đậm (formatting-rules.md)
        if (tieu_de) {
          // Khoản có tiêu đề: bold
          paragraphs.push(
            para(textRun(`${so}. ${tieu_de}`, {
              size: ND30.SIZE_14, bold: true,
            }), {
              alignment: AlignmentType.JUSTIFY, spaceAfter: 60,
              lineSpacing: ND30.LINE_CONTENT,
              indent: { firstLine: indent1cm },
            })
          );
        } else {
          // Khoản bình thường
          paragraphs.push(
            para(textRun(`${so}. ${text || ''}`, { size: ND30.SIZE_14 }), {
              alignment: AlignmentType.JUSTIFY, spaceAfter: 60,
              lineSpacing: ND30.LINE_CONTENT,
              indent: { firstLine: indent1cm },
            })
          );
        }
        break;

      case 'diem':
        // Điểm: in thường, đứng, lùi 1cm (giống Khoản, KHÔNG thêm left)
        paragraphs.push(
          para(textRun(`${so || 'a'}) ${text || ''}`, { size: ND30.SIZE_14 }), {
            alignment: AlignmentType.JUSTIFY, spaceAfter: 60,
            lineSpacing: ND30.LINE_CONTENT,
            indent: { firstLine: indent1cm },
          })
        );
        break;

      case 'muc_lon':
        // Mục: IN HOA, đứng, đậm, canh giữa
        paragraphs.push(
          para(textRun(`${tieu_de || text || ''}`, { size: ND30.SIZE_14, bold: true }), {
            alignment: AlignmentType.CENTER, spaceBefore: 120, spaceAfter: 60,
            lineSpacing: ND30.LINE_CONTENT,
          })
        );
        break;

      default: // 'doan' or fallback
        paragraphs.push(
          para(textRun(text || '', { size: ND30.SIZE_14 }), {
            alignment: AlignmentType.JUSTIFY, spaceAfter: 120,
            lineSpacing: ND30.LINE_CONTENT,
            indent: { firstLine: indent1cm },
          })
        );
    }
  }

  return paragraphs;
}


// ═══════════════════════════════════════════════════
// KHỐI KÝ TÊN + NƠI NHẬN (Ô 7a/7b/7c + 9b)
// Bảng 2 cột: Trái ~45% (Nơi nhận) / Phải ~55% (Ký tên)
// ═══════════════════════════════════════════════════

function createSignatureBlock(data) {
  const { quyen_han_ky, chuc_vu_ky, ho_ten_ky, noi_nhan } = data;
  const noiNhanList = noi_nhan && noi_nhan.length > 0 ? noi_nhan : ['Lưu: VT.'];

  // === Cột trái: Nơi nhận (Ô 9b) ===
  const leftParagraphs = [];

  // "Nơi nhận:" — in thường, NGHIÊNG, ĐẬM, cỡ 12
  leftParagraphs.push(
    para(textRun('Nơi nhận:', { size: ND30.SIZE_12, bold: true, italic: true }), {
      alignment: AlignmentType.LEFT, spaceAfter: 0,
    })
  );

  // Danh sách nơi nhận — in thường, đứng, cỡ 11
  noiNhanList.forEach((noi, i) => {
    const isLast = i === noiNhanList.length - 1;
    let displayText = noi.startsWith('-') ? noi : `- ${noi}`;

    // Dấu cuối dòng
    if (noi.includes('Lưu:') || noi.includes('Lưu :')) {
      if (!displayText.endsWith('.')) displayText += '.';
    } else {
      if (isLast && !displayText.endsWith('.')) displayText += '.';
      else if (!isLast && !displayText.endsWith(';') && !displayText.endsWith('.')) displayText += ';';
    }

    leftParagraphs.push(
      para(textRun(displayText, { size: ND30.SIZE_11 }), {
        alignment: AlignmentType.LEFT, spaceAfter: 0,
      })
    );
  });

  // === Cột phải: Ký tên (Ô 7a, 7c, 7b) ===
  const rightParagraphs = [];

  // Quyền hạn ký: IN HOA, ĐẬM, đứng, cỡ 14
  if (quyen_han_ky) {
    rightParagraphs.push(
      para(textRun(quyen_han_ky.toUpperCase(), { size: ND30.SIZE_14, bold: true }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0,
      })
    );
  }

  // Chức vụ: IN HOA, ĐẬM, đứng, cỡ 14
  if (chuc_vu_ky) {
    rightParagraphs.push(
      para(textRun(chuc_vu_ky.toUpperCase(), { size: ND30.SIZE_14, bold: true }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0,
      })
    );
  }

  // Khoảng trống chữ ký (Ô 7c — 3 dòng trống)
  for (let i = 0; i < 3; i++) {
    rightParagraphs.push(
      para(textRun('', { size: ND30.SIZE_14 }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0,
      })
    );
  }

  // Họ tên: in thường, ĐẬM, đứng, cỡ 14 — KHÔNG học hàm/học vị
  if (ho_ten_ky) {
    rightParagraphs.push(
      para(textRun(ho_ten_ky, { size: ND30.SIZE_14, bold: true }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0,
      })
    );
  }

  // Tỉ lệ cột: ~45% trái / ~55% phải
  const printWidthTwip = convertMillimetersToTwip(165);
  const colLeftWidth = Math.round(printWidthTwip * 0.45);
  const colRightWidth = printWidthTwip - colLeftWidth;

  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: leftParagraphs,
            width: { size: colLeftWidth, type: WidthType.DXA },
            borders: noCellBorders,
          }),
          new TableCell({
            children: rightParagraphs,
            width: { size: colRightWidth, type: WidthType.DXA },
            borders: noCellBorders,
          }),
        ],
      }),
    ],
    width: { size: printWidthTwip, type: WidthType.DXA },
    borders: noBorder,
  });
}


// ═══════════════════════════════════════════════════
// HÀM CHÍNH: TẠO VĂN BẢN HÀNH CHÍNH
// ═══════════════════════════════════════════════════

/**
 * Tạo file DOCX đúng chuẩn ND30 từ dữ liệu JSON
 * @param {Object} data - Dữ liệu văn bản (từ rule-parser hoặc review form)
 * @returns {Promise<Blob>} - Blob file DOCX
 */
export async function generateND30Docx(data) {
  const {
    loai_van_ban = '',
    co_quan_chu_quan = '',
    co_quan_ban_hanh = '',
    so = '',
    ky_hieu = '',
    dia_danh = '',
    ngay = '',
    thang = '',
    nam = '',
    ten_loai_vb = '',
    trich_yeu = '',
    can_cu = [],
    kinh_gui = [],
    noi_dung = [],
    quyen_han_ky = '',
    chuc_vu_ky = '',
    ho_ten_ky = '',
    noi_nhan = [],
  } = data;

  const loaiUpper = loai_van_ban?.toUpperCase() || '';
  const isCongVan = loaiUpper === 'CV';
  const trichYeuCV = isCongVan ? trich_yeu : null;

  // Collect all document children
  const children = [];

  // ── 1. Header block (bảng 2 cột: CQ bên trái, Quốc hiệu bên phải) ──
  children.push(createHeaderBlock({
    co_quan_chu_quan,
    co_quan_ban_hanh,
    so,
    ky_hieu,
    dia_danh,
    ngay,
    thang,
    nam,
    trich_yeu_cv: trichYeuCV,
  }));

  // ── 2. Tên loại + Trích yếu (Ô 5a — chỉ cho VB có tên loại, KHÔNG phải CV) ──
  if (!isCongVan && ten_loai_vb) {
    children.push(...createTenLoaiBlock(ten_loai_vb, trich_yeu));
  }

  // ── 3. Căn cứ ban hành (in nghiêng) ──
  if (can_cu && can_cu.length > 0) {
    children.push(...createCanCuBlock(can_cu));
  }

  // ── 4. "QUYẾT ĐỊNH:" / "CHỈ THỊ:" (cho QĐ, CT) ──
  if ((loaiUpper === 'QD' || loaiUpper === 'CT') && ten_loai_vb) {
    children.push(
      para(textRun(`${ten_loai_vb.toUpperCase()}:`, { size: ND30.SIZE_14, bold: true }), {
        alignment: AlignmentType.CENTER, spaceBefore: 240, spaceAfter: 120,
      })
    );
  }

  // ── 5. Kính gửi (Ô 9a — cho CV, TTr, BC) ──
  const hasKinhGui = ['CV', 'TTR', 'BC'].includes(loaiUpper);
  if (hasKinhGui && kinh_gui && kinh_gui.length > 0) {
    children.push(...createKinhGuiBlock(kinh_gui));
  }

  // ── 6. Nội dung văn bản (Ô 6) ──
  if (noi_dung && noi_dung.length > 0) {
    children.push(...createContentBlock(noi_dung));
  }

  // ── 7. Dấu kết thúc "./" — chỉ cho VB có tên loại (QĐ, CT, NQ...), KHÔNG cho CV ──
  if (!isCongVan) {
    children.push(
      para(textRun('./.', { size: ND30.SIZE_14 }), {
        alignment: AlignmentType.RIGHT, spaceBefore: 120, spaceAfter: 240,
      })
    );
  }

  // ── 8. Khối ký tên + Nơi nhận (bảng 2 cột) ──
  children.push(createSignatureBlock({
    quyen_han_ky,
    chuc_vu_ky,
    ho_ten_ky,
    noi_nhan,
  }));

  // ═══ Tạo Document ═══
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: convertMillimetersToTwip(210),   // A4
            height: convertMillimetersToTwip(297),  // A4
          },
          margin: {
            top: convertMillimetersToTwip(ND30.MARGIN_TOP),       // 20mm
            bottom: convertMillimetersToTwip(ND30.MARGIN_BOTTOM), // 20mm
            left: convertMillimetersToTwip(ND30.MARGIN_LEFT),     // 30mm
            right: convertMillimetersToTwip(ND30.MARGIN_RIGHT),   // 15mm
          },
        },
        pageNumberStart: 1,
        pageNumberFormatType: NumberFormat.DECIMAL,
        titlePage: true, // Ẩn số trang đầu tiên (trang 1)
      },
      headers: {
        // Số trang: canh giữa, trong lề trên, cỡ 13, đứng
        default: new Header({
          children: [
            para(
              new TextRun({
                children: [PageNumber.CURRENT],
                font: ND30.FONT,
                size: ND30.SIZE_13,
                color: '000000',
              }),
              { alignment: AlignmentType.CENTER }
            ),
          ],
        }),
      },
      children,
    }],
  });

  // Xuất Blob
  return await Packer.toBlob(doc);
}


/**
 * Tạo và tải file DOCX xuống
 * @param {Object} data - Dữ liệu từ review form
 * @param {string} [filename] - Tên file
 */
export async function downloadND30Docx(data, filename) {
  const blob = await generateND30Docx(data);

  // Tạo tên file từ dữ liệu
  if (!filename) {
    const so = String(data.so || '00').padStart(2, '0');
    const kh = data.ky_hieu || 'VB';
    filename = `${so}_${kh}.docx`.replace(/\//g, '-');
  }

  saveAs(blob, filename);
  return filename;
}
