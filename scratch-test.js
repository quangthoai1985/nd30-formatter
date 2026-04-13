import { parseVBHC } from './src/rule-parser.js';

const text = `
UBND TỈNH AN GIANG
SỞ TÀI CHÍNH

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Số: 05/QĐ-STC

An Giang, ngày 15 tháng 03 năm 2024

QUYẾT ĐỊNH
Về việc phê duyệt kế hoạch công tác năm 2024

Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;
Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020;

QUYẾT ĐỊNH:

Điều 1. Phê duyệt kế hoạch công tác năm 2024 của Sở Tài chính tỉnh An Giang.
1. Tổng kinh phí dự toán: 500 triệu đồng.
a) Kinh phí hoạt động thường xuyên: 300 triệu đồng.
b) Kinh phí đầu tư phát triển: 200 triệu đồng.
Điều 2. Giao Chánh Văn phòng Sở chủ trì, phối hợp với các phòng ban liên quan tổ chức thực hiện Quyết định này.
Điều 3. Chánh Văn phòng, Trưởng các phòng chuyên môn và các đơn vị có liên quan chịu trách nhiệm thi hành Quyết định này.

TM. SỞ TÀI CHÍNH
GIÁM ĐỐC

Nguyễn Văn A

Nơi nhận:
- Như Điều 2;
- UBND tỉnh (b/c);
- Lưu: VT.
`;

const res = parseVBHC(text);
console.log(JSON.stringify(res, null, 2));

