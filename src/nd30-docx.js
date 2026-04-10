/**
 * ND30 DOCX Generator — Client-side
 * Port từ create_vbhc.py sang JavaScript
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
  Footer,
  SectionType,
  convertMillimetersToTwip,
  Tab,
  TabStopPosition,
  TabStopType,
  HeadingLevel,
  UnderlineType,
} from 'docx';

import { saveAs } from 'file-saver';


// ═══════════════════════════════════════════════════
// HẰNG SỐ ND30 (Fix — Nghị định 30/2020/NĐ-CP)
// ═══════════════════════════════════════════════════

const ND30 = {
  FONT: 'Times New Roman',

  // Cỡ chữ (đơn vị: half-points, nhân 2 so với pt)
  SIZE_QUOCHIEU: 26,        // 13pt
  SIZE_TIEUUEU: 26,         // 13pt
  SIZE_COQUAN: 26,          // 13pt
  SIZE_SO_KYHIEU: 26,       // 13pt
  SIZE_DIADANH: 26,         // 13pt
  SIZE_TEN_LOAI: 28,        // 14pt
  SIZE_TRICH_YEU: 28,       // 14pt
  SIZE_TRICH_YEU_CV: 24,    // 12pt
  SIZE_NOIDUNG: 28,         // 14pt
  SIZE_CANCU: 28,           // 14pt
  SIZE_QUYEN_HAN: 28,       // 14pt
  SIZE_CHUCVU: 28,          // 14pt
  SIZE_HOTEN: 28,           // 14pt
  SIZE_KINHGUI: 28,         // 14pt
  SIZE_NOINHAN_LABEL: 24,   // 12pt
  SIZE_NOINHAN_LIST: 22,    // 11pt
  SIZE_SOTRANG: 26,         // 13pt
  SIZE_LINE: 20,            // 10pt (đường kẻ)

  // Lề (mm)
  MARGIN_TOP: 20,
  MARGIN_BOTTOM: 20,
  MARGIN_LEFT: 30,
  MARGIN_RIGHT: 15,
};

// Viền ẩn (None)
const noBorder = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

const noCellBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

// Helper: tạo TextRun chuẩn
function textRun(text, { size = ND30.SIZE_NOIDUNG, bold = false, italic = false } = {}) {
  return new TextRun({
    text,
    font: ND30.FONT,
    size,
    bold,
    italic,
    color: '000000',
  });
}

// Helper: tạo Paragraph chuẩn
function para(runs, { alignment = AlignmentType.JUSTIFY, spaceBefore = 0, spaceAfter = 0, indent, spacing } = {}) {
  const config = {
    children: Array.isArray(runs) ? runs : [runs],
    alignment,
    spacing: {
      before: spaceBefore,
      after: spaceAfter,
      line: spacing || 276, // ~1.15 lines (276 twips = 1.15 * 240)
    },
  };
  if (indent) {
    config.indent = indent;
  }
  return new Paragraph(config);
}

// Helper: đường kẻ ngang bằng underscores
function separatorLine(length = 30, alignment = AlignmentType.CENTER) {
  return para(
    textRun('_'.repeat(length), { size: ND30.SIZE_LINE }),
    { alignment, spaceBefore: 0, spaceAfter: 60 } // ~3pt
  );
}


// ═══════════════════════════════════════════════════
// KHỐI HEADER (Ô 1, 2, 3, 4, 5b)
// ═══════════════════════════════════════════════════

function createHeaderBlock(data) {
  const { co_quan_chu_quan, co_quan_ban_hanh, so, ky_hieu, dia_danh, ngay, thang, nam, trich_yeu_cv } = data;

  // Cột trái: CQ chủ quản + CQ ban hành + Số ký hiệu + V/v
  const leftParagraphs = [];

  // Dòng 1: CQ chủ quản (IN HOA, không đậm)
  if (co_quan_chu_quan) {
    leftParagraphs.push(
      para(textRun(co_quan_chu_quan.toUpperCase(), { size: ND30.SIZE_COQUAN }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0
      })
    );
  }

  // Dòng 2: CQ ban hành (IN HOA, ĐẬM)
  leftParagraphs.push(
    para(textRun(co_quan_ban_hanh.toUpperCase(), { size: ND30.SIZE_COQUAN, bold: true }), {
      alignment: AlignmentType.CENTER, spaceAfter: 0
    })
  );

  // Đường kẻ dưới CQ ban hành (1/3 dòng chữ)
  const lineLen = Math.max(12, Math.floor(co_quan_ban_hanh.length / 3));
  leftParagraphs.push(separatorLine(lineLen));

  // Số ký hiệu
  leftParagraphs.push(
    para([
      textRun('Số: ', { size: ND30.SIZE_SO_KYHIEU }),
      textRun(`${so}/${ky_hieu}`, { size: ND30.SIZE_SO_KYHIEU }),
    ], {
      alignment: AlignmentType.CENTER, spaceBefore: 120, spaceAfter: 0
    })
  );

  // V/v trích yếu (chỉ cho Công văn)
  if (trich_yeu_cv) {
    leftParagraphs.push(
      para(textRun(`V/v ${trich_yeu_cv}`, { size: ND30.SIZE_TRICH_YEU_CV }), {
        alignment: AlignmentType.CENTER, spaceBefore: 120, spaceAfter: 0
      })
    );
  }

  // Cột phải: Quốc hiệu + Tiêu ngữ + Địa danh
  const ngayStr = String(ngay).padStart(2, '0');
  const thangStr = String(thang).padStart(2, '0');

  const rightParagraphs = [
    // Quốc hiệu (IN HOA, ĐẬM)
    para(textRun('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { size: ND30.SIZE_QUOCHIEU, bold: true }), {
      alignment: AlignmentType.CENTER, spaceAfter: 0
    }),
    // Tiêu ngữ (in thường, ĐẬM, KHÔNG nghiêng)
    para(textRun('Độc lập - Tự do - Hạnh phúc', { size: ND30.SIZE_TIEUUEU, bold: true }), {
      alignment: AlignmentType.CENTER, spaceAfter: 0
    }),
    // Đường kẻ dưới Tiêu ngữ (dài bằng dòng chữ)
    separatorLine(30),
    // Địa danh + ngày tháng (NGHIÊNG)
    para(textRun(`${dia_danh}, ngày ${ngayStr} tháng ${thangStr} năm ${nam}`, {
      size: ND30.SIZE_DIADANH, italic: true
    }), {
      alignment: AlignmentType.CENTER, spaceBefore: 120, spaceAfter: 0
    }),
  ];

  // Tạo bảng 2 cột ẩn viền
  const colLeftWidth = convertMillimetersToTwip(85);
  const colRightWidth = convertMillimetersToTwip(100);

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
    width: { size: colLeftWidth + colRightWidth, type: WidthType.DXA },
    borders: noBorder,
  });
}


// ═══════════════════════════════════════════════════
// KHỐI TÊN LOẠI + TRÍCH YẾU (Ô 5a)
// ═══════════════════════════════════════════════════

function createTenLoaiBlock(ten_loai_vb, trich_yeu) {
  const paragraphs = [];

  // Tên loại VB: IN HOA, ĐẬM
  paragraphs.push(
    para(textRun(ten_loai_vb.toUpperCase(), { size: ND30.SIZE_TEN_LOAI, bold: true }), {
      alignment: AlignmentType.CENTER, spaceBefore: 240, spaceAfter: 0
    })
  );

  // Trích yếu: in thường, ĐẬM
  paragraphs.push(
    para(textRun(trich_yeu, { size: ND30.SIZE_TRICH_YEU, bold: true }), {
      alignment: AlignmentType.CENTER, spaceAfter: 0
    })
  );

  // Đường kẻ
  const lineLen = Math.max(12, Math.floor(trich_yeu.length / 3));
  paragraphs.push(separatorLine(lineLen));

  return paragraphs;
}


// ═══════════════════════════════════════════════════
// KHỐI KÍNH GỬI (Ô 9a)
// ═══════════════════════════════════════════════════

function createKinhGuiBlock(kinh_gui) {
  if (!kinh_gui || kinh_gui.length === 0) return [];

  const paragraphs = [];
  const firstLineIndent = convertMillimetersToTwip(10); // ~1cm

  if (kinh_gui.length === 1) {
    paragraphs.push(
      para([
        textRun('Kính gửi: ', { size: ND30.SIZE_KINHGUI }),
        textRun(kinh_gui[0], { size: ND30.SIZE_KINHGUI }),
      ], {
        alignment: AlignmentType.LEFT,
        spaceBefore: 240, spaceAfter: 120,
        indent: { firstLine: firstLineIndent }
      })
    );
  } else {
    paragraphs.push(
      para(textRun('Kính gửi:', { size: ND30.SIZE_KINHGUI }), {
        alignment: AlignmentType.LEFT,
        spaceBefore: 240, spaceAfter: 0,
        indent: { firstLine: firstLineIndent }
      })
    );
    kinh_gui.forEach((noi, i) => {
      const endChar = i === kinh_gui.length - 1 ? '.' : ';';
      paragraphs.push(
        para(textRun(`                    - ${noi}${endChar}`, { size: ND30.SIZE_KINHGUI }), {
          alignment: AlignmentType.LEFT, spaceAfter: 0
        })
      );
    });
  }

  return paragraphs;
}


// ═══════════════════════════════════════════════════
// KHỐI CĂN CỨ BAN HÀNH
// ═══════════════════════════════════════════════════

function createCanCuBlock(can_cu) {
  if (!can_cu || can_cu.length === 0) return [];
  const firstLineIndent = convertMillimetersToTwip(10);

  return can_cu.map((cc, i) => {
    const endChar = i === can_cu.length - 1 ? '.' : ';';
    return para(textRun(`${cc}${endChar}`, { size: ND30.SIZE_CANCU, italic: true }), {
      alignment: AlignmentType.JUSTIFY, spaceAfter: 0,
      indent: { firstLine: firstLineIndent }
    });
  });
}


// ═══════════════════════════════════════════════════
// KHỐI NỘI DUNG (Ô 6)
// ═══════════════════════════════════════════════════

function createContentBlock(noi_dung) {
  if (!noi_dung || noi_dung.length === 0) return [];

  const paragraphs = [];
  const firstLineIndent = convertMillimetersToTwip(10);

  for (const item of noi_dung) {
    if (typeof item === 'string') {
      // Plain text paragraph
      paragraphs.push(
        para(textRun(item, { size: ND30.SIZE_NOIDUNG }), {
          alignment: AlignmentType.JUSTIFY, spaceAfter: 120,
          indent: { firstLine: firstLineIndent }
        })
      );
      continue;
    }

    const { type, so, tieu_de, text } = item;

    switch (type) {
      case 'dieu':
        paragraphs.push(
          para(textRun(`Điều ${so}. ${tieu_de || text || ''}`, {
            size: ND30.SIZE_NOIDUNG, bold: true
          }), {
            alignment: AlignmentType.JUSTIFY, spaceBefore: 120, spaceAfter: 120,
            indent: { firstLine: firstLineIndent }
          })
        );
        break;

      case 'khoan':
        paragraphs.push(
          para(textRun(`${so}. ${text || ''}`, { size: ND30.SIZE_NOIDUNG }), {
            alignment: AlignmentType.JUSTIFY, spaceAfter: 60,
            indent: { firstLine: firstLineIndent }
          })
        );
        break;

      case 'diem':
        paragraphs.push(
          para(textRun(`${so || 'a'}) ${text || ''}`, { size: ND30.SIZE_NOIDUNG }), {
            alignment: AlignmentType.JUSTIFY, spaceAfter: 60,
            indent: { firstLine: firstLineIndent, left: convertMillimetersToTwip(5) }
          })
        );
        break;

      case 'muc_lon':
        paragraphs.push(
          para(textRun(`${tieu_de || text || ''}`, { size: ND30.SIZE_NOIDUNG, bold: true }), {
            alignment: AlignmentType.CENTER, spaceBefore: 120, spaceAfter: 60
          })
        );
        break;

      default: // 'doan' or fallback
        paragraphs.push(
          para(textRun(text || '', { size: ND30.SIZE_NOIDUNG }), {
            alignment: AlignmentType.JUSTIFY, spaceAfter: 120,
            indent: { firstLine: firstLineIndent }
          })
        );
    }
  }

  return paragraphs;
}


// ═══════════════════════════════════════════════════
// KHỐI KÝ TÊN + NƠI NHẬN (Ô 7, 9b)
// ═══════════════════════════════════════════════════

function createSignatureBlock(data) {
  const { quyen_han_ky, chuc_vu_ky, ho_ten_ky, noi_nhan } = data;
  const noiNhanList = noi_nhan && noi_nhan.length > 0 ? noi_nhan : ['Lưu: VT.'];

  // Cột trái: Nơi nhận
  const leftParagraphs = [];

  // "Nơi nhận:" — nghiêng, đậm, 12pt
  leftParagraphs.push(
    para(textRun('Nơi nhận:', { size: ND30.SIZE_NOINHAN_LABEL, bold: true, italic: true }), {
      alignment: AlignmentType.LEFT, spaceAfter: 0
    })
  );

  // Danh sách nơi nhận — 11pt
  noiNhanList.forEach((noi, i) => {
    const isLast = i === noiNhanList.length - 1;
    let text = noi.startsWith('-') ? noi : `- ${noi}`;

    if (noi.includes('Lưu:') || noi.includes('Lưu :')) {
      if (!text.endsWith('.')) text += '.';
    } else {
      if (isLast && !text.endsWith('.')) text += '.';
      else if (!isLast && !text.endsWith(';')) text += ';';
    }

    leftParagraphs.push(
      para(textRun(text, { size: ND30.SIZE_NOINHAN_LIST }), {
        alignment: AlignmentType.LEFT, spaceAfter: 0
      })
    );
  });

  // Cột phải: Ký tên
  const rightParagraphs = [];

  // Quyền hạn ký: IN HOA, ĐẬM
  if (quyen_han_ky) {
    rightParagraphs.push(
      para(textRun(quyen_han_ky.toUpperCase(), { size: ND30.SIZE_QUYEN_HAN, bold: true }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0
      })
    );
  }

  // Chức vụ: IN HOA, ĐẬM
  if (chuc_vu_ky) {
    rightParagraphs.push(
      para(textRun(chuc_vu_ky.toUpperCase(), { size: ND30.SIZE_CHUCVU, bold: true }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0
      })
    );
  }

  // Khoảng trống chữ ký (3 dòng)
  for (let i = 0; i < 3; i++) {
    rightParagraphs.push(
      para(textRun('', { size: ND30.SIZE_HOTEN }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0
      })
    );
  }

  // Họ tên: in thường, ĐẬM
  if (ho_ten_ky) {
    rightParagraphs.push(
      para(textRun(ho_ten_ky, { size: ND30.SIZE_HOTEN, bold: true }), {
        alignment: AlignmentType.CENTER, spaceAfter: 0
      })
    );
  }

  const pageWidth = convertMillimetersToTwip(210 - ND30.MARGIN_LEFT - ND30.MARGIN_RIGHT);
  const colWidth = Math.floor(pageWidth / 2);

  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: leftParagraphs,
            width: { size: colWidth, type: WidthType.DXA },
            borders: noCellBorders,
          }),
          new TableCell({
            children: rightParagraphs,
            width: { size: colWidth, type: WidthType.DXA },
            borders: noCellBorders,
          }),
        ],
      }),
    ],
    width: { size: pageWidth, type: WidthType.DXA },
    borders: noBorder,
  });
}


// ═══════════════════════════════════════════════════
// HÀM CHÍNH: TẠO VĂN BẢN HÀNH CHÍNH
// ═══════════════════════════════════════════════════

/**
 * Tạo file DOCX đúng chuẩn ND30 từ dữ liệu JSON
 * @param {Object} data - Dữ liệu văn bản từ Gemini AI
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

  const isCongVan = loai_van_ban?.toUpperCase() === 'CV';
  const trichYeuCV = isCongVan ? trich_yeu : null;

  // Collect all document children
  const children = [];

  // 1. Header block (bảng 2 cột)
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

  // 2. Tên loại + Trích yếu (cho VB có tên loại, không phải CV)
  if (!isCongVan && ten_loai_vb) {
    children.push(...createTenLoaiBlock(ten_loai_vb, trich_yeu));
  }

  // 3. Căn cứ ban hành
  if (can_cu && can_cu.length > 0) {
    children.push(...createCanCuBlock(can_cu));
  }

  // 4. "QUYẾT ĐỊNH:" (cho QĐ)
  if (loai_van_ban?.toUpperCase() === 'QD' && ten_loai_vb) {
    children.push(
      para(textRun('QUYẾT ĐỊNH:', { size: ND30.SIZE_NOIDUNG, bold: true }), {
        alignment: AlignmentType.CENTER, spaceBefore: 240, spaceAfter: 120
      })
    );
  }

  // 5. Kính gửi (cho CV, TTr, BC)
  const hasKinhGui = ['CV', 'TTR', 'BC'].includes(loai_van_ban?.toUpperCase());
  if (hasKinhGui && kinh_gui && kinh_gui.length > 0) {
    children.push(...createKinhGuiBlock(kinh_gui));
  }

  // 6. Nội dung văn bản
  if (noi_dung && noi_dung.length > 0) {
    children.push(...createContentBlock(noi_dung));
  }

  // 7. Kết thúc: "./"
  children.push(
    para(textRun('./.', { size: ND30.SIZE_NOIDUNG }), {
      alignment: AlignmentType.RIGHT, spaceBefore: 120, spaceAfter: 240
    })
  );

  // 8. Khối ký tên + Nơi nhận
  children.push(createSignatureBlock({
    quyen_han_ky,
    chuc_vu_ky,
    ho_ten_ky,
    noi_nhan,
  }));

  // Tạo Document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: convertMillimetersToTwip(210),
            height: convertMillimetersToTwip(297),
          },
          margin: {
            top: convertMillimetersToTwip(ND30.MARGIN_TOP),
            bottom: convertMillimetersToTwip(ND30.MARGIN_BOTTOM),
            left: convertMillimetersToTwip(ND30.MARGIN_LEFT),
            right: convertMillimetersToTwip(ND30.MARGIN_RIGHT),
          },
        },
        pageNumberStart: 1,
        pageNumberFormatType: NumberFormat.DECIMAL,
        titlePage: true, // Ẩn số trang đầu tiên
      },
      headers: {
        default: new Header({
          children: [
            para(
              new TextRun({
                children: [PageNumber.CURRENT],
                font: ND30.FONT,
                size: ND30.SIZE_SOTRANG,
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
 * @param {Object} data - Dữ liệu từ Gemini AI
 * @param {string} [filename] - Tên file
 */
export async function downloadND30Docx(data, filename) {
  const blob = await generateND30Docx(data);

  // Tạo tên file từ dữ liệu
  if (!filename) {
    const so = data.so || '00';
    const kh = data.ky_hieu || 'VB';
    filename = `${so}_${kh}.docx`.replace(/\//g, '-');
  }

  saveAs(blob, filename);
  return filename;
}
