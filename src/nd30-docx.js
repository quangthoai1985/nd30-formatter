import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

/**
 * ND30 DOCX Generator — Client-side using Templates
 * Sử dụng docxtemplater để map dữ liệu vào file .docx chuẩn
 */

export async function generateND30Docx(data) {
  const loai_van_ban = (data.loai_van_ban || 'CV').toUpperCase();
  let templateName = 'Template_CongVan.docx';
  
  if (loai_van_ban === 'QD') templateName = 'Template_QuyetDinh.docx';
  else if (loai_van_ban === 'TTR') templateName = 'Template_ToTrinh.docx';
  else if (loai_van_ban === 'NQ') templateName = 'Template_NghiQuyet.docx';
  else if (loai_van_ban === 'CT') templateName = 'Template_ChiThi.docx';
  else if (loai_van_ban === 'TB') templateName = 'Template_ThongBao.docx';
  else if (loai_van_ban === 'KH') templateName = 'Template_KeHoach.docx';
  else if (loai_van_ban === 'BC') templateName = 'Template_BaoCao.docx';
  else if (loai_van_ban === 'BB') templateName = 'Template_BienBan.docx';
  else if (loai_van_ban === 'GM') templateName = 'Template_GiayMoi.docx';
  else if (loai_van_ban === 'GGT') templateName = 'Template_GiayGioiThieu.docx';
  else if (loai_van_ban === 'GNP') templateName = 'Template_GiayNghiPhep.docx';

  // 1. Fetch template từ public folder
  const response = await fetch(`/templates/${templateName}`);
  if (!response.ok) {
    throw new Error(`Không thể rải template: ${templateName}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // 2. Khởi tạo PizZip & Docxtemplater
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true, // Quan trọng để thay block \n thành line breaks
    delimiters: { start: '{{', end: '}}' }
  });

  // 3. Chuẩn bị dữ liệu định dạng JSON
  const ngayStr = String(data.ngay || '').padStart(2, '0');
  const thangStr = String(data.thang || '').padStart(2, '0');
  const namStr = data.nam || '';
  const ngay_thang_nam = `${ngayStr} tháng ${thangStr} năm ${namStr}`;
  
  const soPadded = String(data.so || '').padStart(2, '0');
  const so_ky_hieu = `${soPadded}/${data.ky_hieu || ''}`;

  let noi_dung_text = '';
  if (Array.isArray(data.noi_dung)) {
    noi_dung_text = data.noi_dung.map(item => {
      if (typeof item === 'string') return item;
      return item.tieu_de ? `${item.tieu_de}\n${item.text || ''}` : (item.text || '');
    }).join('\n\n');
  } else {
    noi_dung_text = data.noi_dung || '';
  }

  const noi_nhan_arr = Array.isArray(data.noi_nhan) && data.noi_nhan.length > 0
    ? data.noi_nhan 
    : (data.noi_nhan ? [data.noi_nhan] : ['Lưu: VT.']);

  const templateData = {
    co_quan_chu_quan: data.co_quan_chu_quan?.toUpperCase() || '',
    co_quan_ban_hanh: data.co_quan_ban_hanh?.toUpperCase() || '',
    so_ky_hieu,
    dia_danh: data.dia_danh || '',
    ngay_thang_nam,
    trich_yeu: data.trich_yeu || data.trich_yeu_cv || '',
    kinh_gui: Array.isArray(data.kinh_gui) ? data.kinh_gui.join('\n- ') : (data.kinh_gui || ''),
    can_cu: Array.isArray(data.can_cu) ? data.can_cu.join('\n') : (data.can_cu || ''),
    noi_nhan: noi_nhan_arr, // Array cho {{#noi_nhan}}
    quyen_han_ky: data.quyen_han_ky?.toUpperCase() || '',
    chuc_vu_ky: data.chuc_vu_ky?.toUpperCase() || '',
    ho_ten_ky: data.ho_ten_ky || '',
    
    // Nội dung map cho nhiều file template tương ứng
    noi_dung_cong_van: noi_dung_text,
    noi_dung_quyet_dinh: noi_dung_text,
    noi_dung_to_trinh: noi_dung_text,
    noi_dung_nghi_quyet: noi_dung_text,
    noi_dung_van_ban: noi_dung_text,
    
    // Mapping Biên bản
    ten_cuoc_hop: data.ten_cuoc_hop || '',
    thoi_gian_bat_dau: data.thoi_gian_bat_dau || '',
    thoi_gian_ket_thuc: data.thoi_gian_ket_thuc || '',
    dia_diem: data.dia_diem || '',
    thanh_phan_tham_du: data.thanh_phan_tham_du || '',
    chu_tri: data.chu_tri || '',
    thu_ky: data.thu_ky || '',
    noi_dung_bien_ban: noi_dung_text,
    ho_ten_chu_toa: data.ho_ten_chu_toa || data.chu_tri || '',
    ho_ten_thu_ky: data.ho_ten_thu_ky || data.thu_ky || '',

    // Mapping Giấy mời
    trich_yeu_cuoc_hop: data.trich_yeu || '',
    kinh_moi: data.kinh_moi || '',
    thoi_gian: data.thoi_gian || '',
    luu_y: data.luu_y || '',
    
    // Mapping Giấy giới thiệu / Giấy nghỉ phép
    ho_ten_nguoi_duoc_gioi_thieu: data.ho_ten_nguoi_duoc_gioi_thieu || '',
    chuc_vu_nguoi_duoc_gioi_thieu: data.chuc_vu_nguoi_duoc_gioi_thieu || '',
    noi_duoc_gioi_thieu_den: data.noi_duoc_gioi_thieu_den || '',
    ve_viec: data.ve_viec || '',
    ngay_het_han: data.ngay_het_han || '',
    ho_ten: data.ho_ten || '',
    ngay_viet_don: data.ngay_viet_don || '',
    co_quan_cap: data.co_quan_ban_hanh || '',
    chuc_vu: data.chuc_vu || '',
    thoi_gian_nghi: data.thoi_gian_nghi || '',
    ngay_bat_dau: data.ngay_bat_dau || '',
    ngay_ket_thuc: data.ngay_ket_thuc || '',
    noi_nghi_phep: data.noi_nghi_phep || '',
    loai_nghi_phep: data.loai_nghi_phep || ''
  };

  // 4. Fill Data
  doc.render(templateData);

  // 5. Xuất BLOB file
  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return out;
}

export async function downloadND30Docx(data, filename) {
  const blob = await generateND30Docx(data);

  if (!filename) {
    const so = String(data.so || '00').padStart(2, '0');
    const kh = data.ky_hieu || 'VB';
    filename = `${so}_${kh}.docx`.replace(/\//g, '-');
  }

  saveAs(blob, filename);
  return filename;
}
