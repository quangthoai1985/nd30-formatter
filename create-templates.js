import fs from 'fs';
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
  convertMillimetersToTwip,
  PageNumber,
  NumberFormat,
  Header
} from 'docx';

const ND30 = {
  FONT: 'Times New Roman',
  SIZE_13: 26,
  SIZE_14: 28,
  SIZE_12: 24,
  SIZE_11: 22,
  MARGIN_TOP: 20,
  MARGIN_BOTTOM: 20,
  MARGIN_LEFT: 30,
  MARGIN_RIGHT: 15,
  LINE_SINGLE: 240,
  LINE_CONTENT: 312,
  FIRST_LINE_INDENT: convertMillimetersToTwip(12.7),
};

const BORDER_NONE = { style: BorderStyle.NONE, size: 0 };
const noBorder = { top: BORDER_NONE, bottom: BORDER_NONE, left: BORDER_NONE, right: BORDER_NONE };

function textRun(text, { size = ND30.SIZE_14, bold = false, italic = false } = {}) {
  return new TextRun({ text, font: ND30.FONT, size, bold, italic, color: '000000' });
}

function para(runs, { alignment = AlignmentType.JUSTIFY, spaceBefore = 0, spaceAfter = 0, indent, lineSpacing = ND30.LINE_SINGLE } = {}) {
  const config = {
    children: Array.isArray(runs) ? runs : [runs],
    alignment,
    spacing: { before: spaceBefore, after: spaceAfter, line: lineSpacing, lineRule: 'auto' },
  };
  if (indent) config.indent = indent;
  return new Paragraph(config);
}

function separatorLine(type = 'short', containerWidthMm = 165) {
  const lineRatio = type === 'full' ? 0.85 : 0.40;
  const lineWidthMm = Math.round(containerWidthMm * lineRatio);
  const sidePadMm = Math.round((containerWidthMm - lineWidthMm) / 2);

  return new Paragraph({
    children: [new TextRun({ text: '', size: 2 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 },
    indent: { left: convertMillimetersToTwip(sidePadMm), right: convertMillimetersToTwip(sidePadMm) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } }
  });
}

function createHeaderTable(isCongVan = false) {
  const LEFT_COL_MM = 74;
  const RIGHT_COL_MM = 91;

  const leftParagraphs = [
    para(textRun('{{co_quan_chu_quan}}', { size: ND30.SIZE_13 }), { alignment: AlignmentType.CENTER }),
    para(textRun('{{co_quan_ban_hanh}}', { size: ND30.SIZE_13, bold: true }), { alignment: AlignmentType.CENTER }),
    separatorLine('short', LEFT_COL_MM),
    para(textRun('Số: {{so_ky_hieu}}', { size: ND30.SIZE_13 }), { alignment: AlignmentType.CENTER, spaceBefore: 120 }),
  ];

  if (isCongVan) {
    leftParagraphs.push(para(textRun('V/v {{trich_yeu}}', { size: ND30.SIZE_12 }), { alignment: AlignmentType.CENTER, spaceBefore: 60 }));
  }

  const rightParagraphs = [
    para(textRun('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { size: ND30.SIZE_13, bold: true }), { alignment: AlignmentType.CENTER }),
    para(textRun('Độc lập - Tự do - Hạnh phúc', { size: ND30.SIZE_13, bold: true }), { alignment: AlignmentType.CENTER }),
    separatorLine('full', RIGHT_COL_MM),
    para(textRun('{{dia_danh}}, ngày {{ngay_thang_nam}}', { size: ND30.SIZE_13, italic: true }), { alignment: AlignmentType.CENTER, spaceBefore: 120 }),
  ];

  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: leftParagraphs, width: { size: convertMillimetersToTwip(LEFT_COL_MM), type: WidthType.DXA }, borders: noBorder }),
          new TableCell({ children: rightParagraphs, width: { size: convertMillimetersToTwip(RIGHT_COL_MM), type: WidthType.DXA }, borders: noBorder }),
        ],
      }),
    ],
    width: { size: convertMillimetersToTwip(165), type: WidthType.DXA },
    borders: noBorder,
  });
}

function createSignatureTable() {
  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              para(textRun('Nơi nhận:', { size: ND30.SIZE_12, bold: true, italic: true }), { alignment: AlignmentType.LEFT }),
              para(textRun('{{#noi_nhan}}', { size: ND30.SIZE_11 }), { alignment: AlignmentType.LEFT }),
              para(textRun('- {{.}};', { size: ND30.SIZE_11 }), { alignment: AlignmentType.LEFT }),
              para(textRun('{{/noi_nhan}}', { size: ND30.SIZE_11 }), { alignment: AlignmentType.LEFT })
            ],
            width: { size: convertMillimetersToTwip(74), type: WidthType.DXA },
            borders: noBorder,
          }),
          new TableCell({
            children: [
              para(textRun('{{quyen_han_ky}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
              para(textRun('{{chuc_vu_ky}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
              para(textRun('\n\n\n', { size: ND30.SIZE_14 }), { alignment: AlignmentType.CENTER }),
              para(textRun('{{ho_ten_ky}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER })
            ],
            width: { size: convertMillimetersToTwip(91), type: WidthType.DXA },
            borders: noBorder,
          }),
        ],
      }),
    ],
    width: { size: convertMillimetersToTwip(165), type: WidthType.DXA },
    borders: noBorder,
  });
}

function getBaseDocProps(children) {
  return {
    sections: [{
      properties: {
        page: {
          size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
          margin: { top: convertMillimetersToTwip(ND30.MARGIN_TOP), bottom: convertMillimetersToTwip(ND30.MARGIN_BOTTOM), left: convertMillimetersToTwip(ND30.MARGIN_LEFT), right: convertMillimetersToTwip(ND30.MARGIN_RIGHT) },
        },
        pageNumberStart: 1, titlePage: true,
      },
      headers: {
        default: new Header({
          children: [para(new TextRun({ children: [PageNumber.CURRENT], font: ND30.FONT, size: ND30.SIZE_13 }), { alignment: AlignmentType.CENTER })],
        }),
      },
      children,
    }],
  };
}

async function createCongVan() {
  const children = [
    createHeaderTable(true),
    para(textRun('Kính gửi: {{kinh_gui}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 240, spaceAfter: 120, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('{{noi_dung_cong_van}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.JUSTIFY, spaceAfter: 200, lineSpacing: ND30.LINE_CONTENT, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    createSignatureTable()
  ];
  const doc = new Document(getBaseDocProps(children));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('Template_CongVan.docx', buffer);
}

async function createQuyetDinh() {
  const children = [
    createHeaderTable(false),
    para(textRun('QUYẾT ĐỊNH', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240 }),
    para(textRun('{{trich_yeu}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
    separatorLine('short', 165),
    para([textRun('{{can_cu}}', { size: ND30.SIZE_14, italic: true })], { alignment: AlignmentType.JUSTIFY, spaceAfter: 80, lineSpacing: ND30.LINE_CONTENT, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('QUYẾT ĐỊNH:', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240, spaceAfter: 120 }),
    para(textRun('{{noi_dung_quyet_dinh}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.JUSTIFY, spaceAfter: 200, lineSpacing: ND30.LINE_CONTENT, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('./.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.RIGHT, spaceBefore: 120, spaceAfter: 240 }),
    createSignatureTable()
  ];
  const doc = new Document(getBaseDocProps(children));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('Template_QuyetDinh.docx', buffer);
}

async function createToTrinh() {
  const children = [
    createHeaderTable(false),
    para(textRun('TỜ TRÌNH', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240 }),
    para(textRun('{{trich_yeu}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
    separatorLine('short', 165),
    para(textRun('Kính gửi: {{kinh_gui}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 240, spaceAfter: 120, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('{{noi_dung_to_trinh}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.JUSTIFY, spaceAfter: 200, lineSpacing: ND30.LINE_CONTENT, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('./.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.RIGHT, spaceBefore: 120, spaceAfter: 240 }),
    createSignatureTable()
  ];
  const doc = new Document(getBaseDocProps(children));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('Template_ToTrinh.docx', buffer);
}

async function createNghiQuyet() {
  const children = [
    createHeaderTable(false),
    para(textRun('NGHỊ QUYẾT', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240 }),
    para(textRun('{{trich_yeu}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
    separatorLine('short', 165),
    para([textRun('{{can_cu}}', { size: ND30.SIZE_14, italic: true })], { alignment: AlignmentType.JUSTIFY, spaceAfter: 80, lineSpacing: ND30.LINE_CONTENT, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('QUYẾT NGHỊ:', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240, spaceAfter: 120 }),
    para(textRun('{{noi_dung_nghi_quyet}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.JUSTIFY, spaceAfter: 200, lineSpacing: ND30.LINE_CONTENT, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('./.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.RIGHT, spaceBefore: 120, spaceAfter: 240 }),
    createSignatureTable()
  ];
  const doc = new Document(getBaseDocProps(children));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('Template_NghiQuyet.docx', buffer);
}

function createVanBanCoTenLoai(tenLoaiId, tenLoaiText) {
  return async function() {
    const children = [
      createHeaderTable(false),
      para(textRun(tenLoaiText, { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240 }),
      para(textRun('{{trich_yeu}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
      separatorLine('short', 165),
      para(textRun('{{noi_dung_van_ban}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.JUSTIFY, spaceAfter: 200, spaceBefore: 120, lineSpacing: ND30.LINE_CONTENT, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
      para(textRun('./.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.RIGHT, spaceBefore: 120, spaceAfter: 240 }),
      createSignatureTable()
    ];
    const doc = new Document(getBaseDocProps(children));
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(`Template_${tenLoaiId}.docx`, buffer);
  }
}

const createChiThi = createVanBanCoTenLoai('ChiThi', 'CHỈ THỊ');
const createThongBao = createVanBanCoTenLoai('ThongBao', 'THÔNG BÁO');
const createKeHoach = createVanBanCoTenLoai('KeHoach', 'KẾ HOẠCH');
const createBaoCao = createVanBanCoTenLoai('BaoCao', 'BÁO CÁO');

async function createBienBan() {
  const children = [
    createHeaderTable(false),
    para(textRun('BIÊN BẢN', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240 }),
    para(textRun('{{ten_cuoc_hop}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
    separatorLine('short', 165),
    para(textRun('Thời gian bắt đầu: {{thoi_gian_bat_dau}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 120 }),
    para(textRun('Địa điểm: {{dia_diem}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Thành phần tham dự: {{thanh_phan_tham_du}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Chủ trì (chủ tọa): {{chu_tri}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Thư ký (người ghi biên bản): {{thu_ky}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Nội dung: {{noi_dung_bien_ban}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.JUSTIFY, spaceBefore: 120, spaceAfter: 120, lineSpacing: ND30.LINE_CONTENT }),
    para(textRun('Cuộc họp kết thúc vào {{thoi_gian_ket_thuc}}.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, spaceAfter: 120 }),
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                para(textRun('THƯ KÝ', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
                para(textRun('(Ký, ghi rõ họ tên)', { size: ND30.SIZE_12, italic: true }), { alignment: AlignmentType.CENTER }),
                para(textRun('\n\n\n', { size: ND30.SIZE_14 }), { alignment: AlignmentType.CENTER }),
                para(textRun('{{ho_ten_thu_ky}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER })
              ],
              width: { size: convertMillimetersToTwip(74), type: WidthType.DXA },
              borders: noBorder,
            }),
            new TableCell({
              children: [
                para(textRun('CHỦ TỌA', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
                para(textRun('(Ký, ghi rõ họ tên)', { size: ND30.SIZE_12, italic: true }), { alignment: AlignmentType.CENTER }),
                para(textRun('\n\n\n', { size: ND30.SIZE_14 }), { alignment: AlignmentType.CENTER }),
                para(textRun('{{ho_ten_chu_toa}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER })
              ],
              width: { size: convertMillimetersToTwip(91), type: WidthType.DXA },
              borders: noBorder,
            }),
          ],
        }),
      ],
      width: { size: convertMillimetersToTwip(165), type: WidthType.DXA },
      borders: noBorder,
    })
  ];
  const doc = new Document(getBaseDocProps(children));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('Template_BienBan.docx', buffer);
}

async function createGiayMoi() {
  const children = [
    createHeaderTable(false),
    para(textRun('GIẤY MỜI', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240 }),
    para(textRun('{{trich_yeu_cuoc_hop}}', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER }),
    separatorLine('short', 165),
    para(textRun('{{co_quan_ban_hanh}} trân trọng kính mời: {{kinh_moi}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.JUSTIFY, spaceBefore: 120, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('Tới dự: {{ten_cuoc_hop}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('Chủ trì: {{chu_tri}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('Thời gian: {{thoi_gian}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('Địa điểm: {{dia_diem}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    para(textRun('Các vấn đề lưu ý: {{luu_y}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, spaceAfter: 120, indent: { firstLine: ND30.FIRST_LINE_INDENT } }),
    createSignatureTable()
  ];
  const doc = new Document(getBaseDocProps(children));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('Template_GiayMoi.docx', buffer);
}

async function createGiayGioiThieu() {
  const children = [
    createHeaderTable(false),
    para(textRun('GIẤY GIỚI THIỆU', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240 }),
    separatorLine('short', 165),
    para([textRun('{{co_quan_ban_hanh}}', { size: ND30.SIZE_14, italic: true }), textRun(' trân trọng giới thiệu:', { size: ND30.SIZE_14 })], { alignment: AlignmentType.LEFT, spaceBefore: 120 }),
    para(textRun('Ông (bà): {{ho_ten_nguoi_duoc_gioi_thieu}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Chức vụ: {{chuc_vu_nguoi_duoc_gioi_thieu}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Được cử đến: {{noi_duoc_gioi_thieu_den}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Về việc: {{ve_viec}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, spaceAfter: 60 }),
    para(textRun('Đề nghị Quý cơ quan tạo điều kiện để ông (bà) có tên ở trên hoàn thành nhiệm vụ.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, spaceAfter: 60 }),
    para(textRun('Giấy này có giá trị đến hết ngày {{ngay_het_han}}./.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, spaceAfter: 120 }),
    createSignatureTable()
  ];
  const doc = new Document(getBaseDocProps(children));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('Template_GiayGioiThieu.docx', buffer);
}

async function createGiayNghiPhep() {
  const children = [
    createHeaderTable(false),
    para(textRun('GIẤY NGHỈ PHÉP', { size: ND30.SIZE_14, bold: true }), { alignment: AlignmentType.CENTER, spaceBefore: 240 }),
    separatorLine('short', 165),
    para(textRun('Xét Đơn đề nghị nghỉ phép ngày {{ngay_viet_don}} của ông (bà) {{ho_ten}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 120 }),
    para(textRun('{{co_quan_cap}} cấp cho:', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Ông (bà): {{ho_ten}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Chức vụ: {{chuc_vu}}', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60 }),
    para(textRun('Được nghỉ phép trong thời gian {{thoi_gian_nghi}} kể từ ngày {{ngay_bat_dau}} đến hết ngày {{ngay_ket_thuc}} tại {{noi_nghi_phep}}.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.JUSTIFY, spaceBefore: 60 }),
    para(textRun('Số ngày nghỉ phép nêu trên được tính vào thời gian {{loai_nghi_phep}}./.', { size: ND30.SIZE_14 }), { alignment: AlignmentType.LEFT, spaceBefore: 60, spaceAfter: 120 }),
    createSignatureTable()
  ];
  const doc = new Document(getBaseDocProps(children));
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('Template_GiayNghiPhep.docx', buffer);
}

async function main() {
  const tasks = [
    { fn: createCongVan, name: 'Template_CongVan' },
    { fn: createQuyetDinh, name: 'Template_QuyetDinh' },
    { fn: createToTrinh, name: 'Template_ToTrinh' },
    { fn: createNghiQuyet, name: 'Template_NghiQuyet' },
    { fn: createChiThi, name: 'Template_ChiThi' },
    { fn: createThongBao, name: 'Template_ThongBao' },
    { fn: createKeHoach, name: 'Template_KeHoach' },
    { fn: createBaoCao, name: 'Template_BaoCao' },
    { fn: createBienBan, name: 'Template_BienBan' },
    { fn: createGiayMoi, name: 'Template_GiayMoi' },
    { fn: createGiayGioiThieu, name: 'Template_GiayGioiThieu' },
    { fn: createGiayNghiPhep, name: 'Template_GiayNghiPhep' }
  ];

  for (const task of tasks) {
    try {
      await task.fn();
      console.log(`Created ${task.name}.docx`);
    } catch (e) {
      console.error(`Failed to create ${task.name}.docx:`, e);
    }
  }
}

main().catch(console.error);
