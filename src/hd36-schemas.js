/**
 * hd36-schemas.js — Schema từng loại văn bản Đảng theo Hướng dẫn 36-HD/VPTW
 *
 * Prefix "D_" phân biệt với schema NĐ30.
 * 14 loại VB: NQ, CT, KL, QĐ, QĐi, QC, BC, TTr, TB, HD, CTr, TT, CV, BB
 */

export const HD36_SCHEMAS = {

  D_NQ: {
    label: 'Nghị quyết (Đảng)',
    kyHieu: 'NQ',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    showChucDanhBanHanh: true,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'về tăng cường công tác cán bộ...',
    noiDungPlaceholder:
      'Điều 1. [Nội dung quyết nghị]\nĐiều 2. [Giao nhiệm vụ thực hiện]\nĐiều 3. [Hiệu lực thi hành]',
    noiDungHint: 'Nghị quyết Đảng dùng cấu trúc Điều hoặc Phần/Mục.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_CT: {
    label: 'Chỉ thị (Đảng)',
    kyHieu: 'CT',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'về tăng cường lãnh đạo công tác...',
    noiDungPlaceholder:
      '[Đoạn mở đầu — phân tích tình hình]\n1. [Yêu cầu, nhiệm vụ thứ nhất]\n2. [Yêu cầu, nhiệm vụ thứ hai]',
    noiDungHint: 'Chỉ thị Đảng thường dùng đoạn mở đầu + danh sách yêu cầu đánh số.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_KL: {
    label: 'Kết luận',
    kyHieu: 'KL',
    showTenLoai: true,
    showCanCu: false,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'về kết quả kiểm tra công tác...',
    noiDungPlaceholder:
      '[Phần đánh giá tình hình]\n[Phần kết luận chính]\n[Phần nhiệm vụ, giải pháp]',
    noiDungHint: 'Kết luận thường gồm phần đánh giá và phần kết luận chính.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_QD: {
    label: 'Quyết định (Đảng)',
    kyHieu: 'QĐ',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    showChucDanhBanHanh: true,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'về việc thành lập Ban Chỉ đạo...',
    noiDungPlaceholder:
      'Điều 1. [Nội dung quyết định]\nĐiều 2. [Trách nhiệm thi hành]\nĐiều 3. [Hiệu lực thi hành]',
    noiDungHint: 'Quyết định Đảng dùng cấu trúc Điều – Khoản.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_QDI: {
    label: 'Quy định',
    kyHieu: 'QĐi',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'về phân cấp quản lý cán bộ...',
    noiDungPlaceholder:
      'Chương I. QUY ĐỊNH CHUNG\nĐiều 1. Phạm vi điều chỉnh\nĐiều 2. Đối tượng áp dụng\nChương II. QUY ĐỊNH CỤ THỂ',
    noiDungHint: 'Quy định dùng cấu trúc Chương – Điều – Khoản – Điểm.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_QC: {
    label: 'Quy chế',
    kyHieu: 'QC',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'làm việc của Ban Thường vụ...',
    noiDungPlaceholder:
      'Chương I. QUY ĐỊNH CHUNG\nĐiều 1. Phạm vi điều chỉnh\nChương II. NHIỆM VỤ, QUYỀN HẠN',
    noiDungHint: 'Quy chế dùng cấu trúc Chương – Điều tương tự Quy định.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_BC: {
    label: 'Báo cáo (Đảng)',
    kyHieu: 'BC',
    showTenLoai: true,
    showCanCu: false,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'kết quả công tác xây dựng Đảng năm...',
    noiDungPlaceholder:
      '[Phần I. Kết quả đạt được]\n[Phần II. Hạn chế, nguyên nhân]\n[Phần III. Phương hướng, nhiệm vụ]',
    noiDungHint: 'Báo cáo Đảng chia Phần/Mục: kết quả → hạn chế → phương hướng.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_TTR: {
    label: 'Tờ trình (Đảng)',
    kyHieu: 'TTr',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: true,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'về đề nghị phê duyệt...',
    noiDungPlaceholder:
      '[Phần I. Sự cần thiết]\n[Phần II. Nội dung đề xuất]\n[Phần III. Kiến nghị]',
    noiDungHint: 'Tờ trình Đảng có phần Kính gửi + nội dung đề xuất.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu', 'kinh_gui'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_TB: {
    label: 'Thông báo (Đảng)',
    kyHieu: 'TB',
    showTenLoai: true,
    showCanCu: false,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'ý kiến của Ban Thường vụ về...',
    noiDungPlaceholder:
      '[Đoạn 1 — Nội dung thông báo]\n[Đoạn 2 — Yêu cầu thực hiện]',
    noiDungHint: 'Thông báo Đảng dùng văn xuôi theo đoạn.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_HD: {
    label: 'Hướng dẫn (Đảng)',
    kyHieu: 'HD',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'thực hiện Quy định số...',
    noiDungPlaceholder:
      '[Phần I. Phạm vi, đối tượng]\n[Phần II. Nội dung hướng dẫn]\n[Phần III. Tổ chức thực hiện]',
    noiDungHint: 'Hướng dẫn Đảng chia Phần/Mục logic.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_CTR: {
    label: 'Chương trình',
    kyHieu: 'CTr',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'hành động thực hiện Nghị quyết số...',
    noiDungPlaceholder:
      '[Phần I. Mục tiêu, yêu cầu]\n[Phần II. Nội dung chương trình]\n[Phần III. Tổ chức thực hiện]',
    noiDungHint: 'Chương trình chia Phần rõ ràng: mục tiêu → nội dung → tổ chức.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_TT: {
    label: 'Thông tri',
    kyHieu: 'TT',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'về triển khai thực hiện Chỉ thị số...',
    noiDungPlaceholder:
      '[Đoạn mở đầu — nêu lý do]\n1. [Yêu cầu thứ nhất]\n2. [Yêu cầu thứ hai]',
    noiDungHint: 'Thông tri dùng văn xuôi + danh sách yêu cầu.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_CV: {
    label: 'Công văn (Đảng)',
    kyHieu: 'CV',
    showTenLoai: false,
    showCanCu: false,
    showKinhGui: true,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'Chuẩn bị hội nghị tổng kết...',
    noiDungPlaceholder:
      '[Đoạn mở đầu — lý do]\n[Đoạn nội dung chính]\n[Đề nghị / Trân trọng...]',
    noiDungHint: 'Công văn Đảng dùng văn xuôi. Không có tên loại VB. Trích yếu cỡ 12, nghiêng.',
    required: ['co_quan_ban_hanh', 'so_ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu', 'kinh_gui'],
    warned: ['co_quan_cap_tren', 'dia_danh', 'nguoi_ky'],
  },

  D_BB: {
    label: 'Biên bản (Đảng)',
    kyHieu: 'BB',
    showTenLoai: true,
    showCanCu: false,
    showKinhGui: false,
    trichYeuLabel: 'Trích yếu',
    trichYeuPlaceholder: 'Hội nghị Ban Chấp hành lần thứ...',
    noiDungPlaceholder:
      'Thời gian: ...\nĐịa điểm: ...\nChủ trì: ...\nNội dung:\n[Diễn biến]\n[Kết luận]',
    noiDungHint: 'Biên bản Đảng có 2 chữ ký (người ghi + chủ trì) và có thể có phần xác nhận.',
    required: ['co_quan_ban_hanh', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['dia_danh'],
  },
};

/**
 * Lấy schema HD36 cho loại văn bản
 */
export function getHD36Schema(loaiVanBan) {
  return HD36_SCHEMAS[loaiVanBan] ?? null;
}

/**
 * Kiểm tra mã loại VB có thuộc HD36 không
 */
export function isHD36Type(code) {
  return code?.startsWith('D_') ?? false;
}

/**
 * Map tên loại VB tiếng Việt → ký hiệu HD36
 */
export const HD36_TYPE_MAP = {
  'NGHỊ QUYẾT': 'D_NQ',
  'CHỈ THỊ': 'D_CT',
  'KẾT LUẬN': 'D_KL',
  'QUYẾT ĐỊNH': 'D_QD',
  'QUY ĐỊNH': 'D_QDI',
  'QUY CHẾ': 'D_QC',
  'BÁO CÁO': 'D_BC',
  'TỜ TRÌNH': 'D_TTR',
  'THÔNG BÁO': 'D_TB',
  'HƯỚNG DẪN': 'D_HD',
  'CHƯƠNG TRÌNH': 'D_CTR',
  'THÔNG TRI': 'D_TT',
  'BIÊN BẢN': 'D_BB',
};
