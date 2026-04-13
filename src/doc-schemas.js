/**
 * doc-schemas.js — Schema từng loại văn bản hành chính theo ND30
 *
 * Mỗi schema định nghĩa:
 *  - showTenLoai    : hiển thị trường "Tên loại VB" hay không
 *  - showCanCu      : hiển thị section "Căn cứ ban hành" hay không
 *  - showKinhGui    : hiển thị section "Kính gửi" hay không
 *  - trichYeuLabel  : nhãn của trường Trích yếu
 *  - trichYeuPlaceholder : placeholder của trường Trích yếu
 *  - noiDungPlaceholder  : placeholder của textarea Nội dung
 *  - noiDungHint    : gợi ý cấu trúc nội dung hiển thị dưới textarea
 *  - required       : mảng id-field bắt buộc (block xuất DOCX nếu thiếu)
 *  - warned         : mảng id-field cảnh báo (vẫn xuất được nhưng hiển thị warning)
 */

export const DOC_SCHEMAS = {

  QD: {
    label: 'Quyết định',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    showChucDanhBanHanh: true,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Về việc ban hành quy chế...',
    noiDungPlaceholder:
      'Điều 1. [Tên điều đầu tiên]\n1. [Nội dung khoản 1]\na) [Điểm a]\nĐiều 2. [Trách nhiệm thi hành]\nĐiều 3. [Hiệu lực thi hành]',
    noiDungHint: 'Quyết định dùng cấu trúc Điều – Khoản. Điều cuối quy định hiệu lực và trách nhiệm.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_chu_quan', 'dia_danh', 'can_cu', 'ho_ten_ky'],
  },

  NQ: {
    label: 'Nghị quyết',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    showChucDanhBanHanh: true,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Về việc thông qua...',
    noiDungPlaceholder:
      'Điều 1. [Thông qua / Quyết nghị...]\nĐiều 2. [Giao nhiệm vụ thực hiện]\nĐiều 3. [Hiệu lực thi hành]',
    noiDungHint: 'Nghị quyết có cấu trúc Điều tương tự Quyết định.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_chu_quan', 'dia_danh', 'can_cu', 'ho_ten_ky'],
  },

  CV: {
    label: 'Công văn',
    showTenLoai: false,    // CV không có tên loại riêng — hiển thị V/v trong header
    showCanCu: false,      // CV không có căn cứ ban hành
    showKinhGui: true,
    trichYeuLabel: 'V/v (trích yếu)',
    trichYeuPlaceholder: 'đề nghị... / thông báo... / báo cáo...',
    noiDungPlaceholder:
      '[Đoạn mở đầu — nêu lý do, căn cứ]\n[Đoạn nội dung chính]\n[Đề nghị / Kính báo / Trân trọng...]',
    noiDungHint: 'Công văn dùng văn xuôi theo đoạn, không dùng Điều/Khoản. Thường kết thúc bằng câu đề nghị hoặc kính báo.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'kinh_gui', 'trich_yeu'],
    warned: ['co_quan_chu_quan', 'dia_danh', 'ho_ten_ky'],
  },

  TB: {
    label: 'Thông báo',
    showTenLoai: true,
    showCanCu: false,
    showKinhGui: false,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Về việc thông báo...',
    noiDungPlaceholder:
      '[Đoạn 1 — lý do, hoàn cảnh thông báo]\n[Đoạn 2 — nội dung thông báo chính]\n[Đoạn 3 — yêu cầu thực hiện]',
    noiDungHint: 'Thông báo dùng văn xuôi theo đoạn. Kết thúc bằng yêu cầu hoặc lưu ý thực hiện.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['dia_danh', 'ho_ten_ky'],
  },

  TTR: {
    label: 'Tờ trình',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: true,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Về việc đề nghị phê duyệt...',
    noiDungPlaceholder:
      '[Phần I. Sự cần thiết / Cơ sở pháp lý]\n[Phần II. Nội dung đề xuất]\n[Phần III. Kiến nghị]\nKính trình...',
    noiDungHint: 'Tờ trình chia Phần/Mục rõ ràng. Kết thúc bằng kiến nghị và kính trình cấp có thẩm quyền phê duyệt.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'kinh_gui', 'trich_yeu'],
    warned: ['co_quan_chu_quan', 'can_cu', 'dia_danh', 'ho_ten_ky'],
  },

  BC: {
    label: 'Báo cáo',
    showTenLoai: true,
    showCanCu: false,
    showKinhGui: true,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Về việc báo cáo tình hình...',
    noiDungPlaceholder:
      '[Phần I. Kết quả thực hiện]\n1. [Mục 1]\n2. [Mục 2]\n[Phần II. Tồn tại, hạn chế]\n[Phần III. Phương hướng, đề xuất]',
    noiDungHint: 'Báo cáo chia theo Phần/Mục: thực trạng → đánh giá → đề xuất. Kinh gửi là tuỳ chọn nếu báo cáo định kỳ.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_chu_quan', 'kinh_gui', 'dia_danh', 'ho_ten_ky'],
  },

  KH: {
    label: 'Kế hoạch',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Về việc triển khai...',
    noiDungPlaceholder:
      '[Phần I. Mục tiêu, yêu cầu]\n[Phần II. Nội dung công việc cụ thể]\n[Phần III. Tổ chức thực hiện]\n[Phần IV. Nguồn lực (nếu cần)]',
    noiDungHint: 'Kế hoạch chia Phần rõ ràng: mục tiêu → nội dung → phân công → nguồn lực → tiến độ.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_chu_quan', 'can_cu', 'dia_danh', 'ho_ten_ky'],
  },

  CT: {
    label: 'Chỉ thị',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Về việc tăng cường...',
    noiDungPlaceholder:
      '[Đoạn mở đầu — phân tích tình hình, lý do ban hành]\nĐiều 1. [Yêu cầu, nhiệm vụ]\n1. [Nội dung cụ thể]\nĐiều 2. [Trách nhiệm tổ chức thực hiện]',
    noiDungHint: 'Chỉ thị thường mở đầu bằng đoạn phân tích, sau đó dùng Điều/Khoản cho các yêu cầu chỉ đạo.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_chu_quan', 'can_cu', 'dia_danh', 'ho_ten_ky'],
  },

  HD: {
    label: 'Hướng dẫn',
    showTenLoai: true,
    showCanCu: true,
    showKinhGui: false,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Về việc hướng dẫn thực hiện...',
    noiDungPlaceholder:
      '[Phần I. Phạm vi, đối tượng áp dụng]\n[Phần II. Nội dung hướng dẫn]\n1. [Mục 1]\n2. [Mục 2]\n[Phần III. Tổ chức thực hiện]',
    noiDungHint: 'Hướng dẫn chia Phần/Mục theo logic: phạm vi → nội dung chi tiết → tổ chức thực hiện.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam', 'trich_yeu'],
    warned: ['co_quan_chu_quan', 'can_cu', 'dia_danh', 'ho_ten_ky'],
  },

  BB: {
    label: 'Biên bản',
    showTenLoai: true,
    showCanCu: false,
    showKinhGui: false,
    trichYeuLabel: 'Về việc',
    trichYeuPlaceholder: 'Biên bản họp... / kiểm tra... / bàn giao...',
    noiDungPlaceholder:
      'Thời gian: [giờ, ngày, tháng, năm]\nĐịa điểm: [...]\nThành phần tham dự:\n- [Chủ trì]\n- [Thành viên]\n\nNội dung:\n[Diễn biến chính]\n[Kết luận / Quyết định]\n\nBiên bản kết thúc lúc [giờ] cùng ngày.',
    noiDungHint: 'Biên bản ghi đầy đủ: thời gian, địa điểm, thành phần, nội dung, kết quả. Chữ ký của ít nhất 2 bên.',
    required: ['co_quan_ban_hanh', 'so', 'ky_hieu', 'ngay', 'thang', 'nam'],
    warned: ['dia_danh'],
  },
};

/**
 * Lấy schema cho loại văn bản, fallback về schema mặc định nếu không tìm thấy
 */
export function getSchema(loaiVanBan) {
  return DOC_SCHEMAS[loaiVanBan?.toUpperCase()] ?? null;
}

/**
 * Map field-id review form → key trong data object
 */
export const FIELD_ID_MAP = {
  'review-cq-ban-hanh': 'co_quan_ban_hanh',
  'review-cq-chu-quan': 'co_quan_chu_quan',
  'review-so':          'so',
  'review-ky-hieu':     'ky_hieu',
  'review-ngay':        'ngay',
  'review-thang':       'thang',
  'review-nam':         'nam',
  'review-dia-danh':    'dia_danh',
  'review-trich-yeu':   'trich_yeu',
  'review-can-cu':      'can_cu',
  'review-kinh-gui':    'kinh_gui',
  'review-ho-ten':      'ho_ten_ky',
};
