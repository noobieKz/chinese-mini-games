# Dữ liệu bài học cho game

Cả 4 game (Ghép chữ, Nối nghĩa, Chém hoa quả, Rồng săn chữ) đọc chung một bộ từ vựng chia theo **Cấp độ HSK → Bài học**. Người chơi chọn **Tổng hợp** (cả cấp độ, ngẫu nhiên), **Chỉ bài N**, hoặc **Ôn bài 1–N**.

## Cập nhật trên web

Mở **Quản lý bài học** trong sảnh hoặc vào `/teacher`. Đăng nhập, chọn **Game → Cấp độ HSK → Bài học** để xem, thêm, sửa hoặc gỡ các từ. Từ mới được thêm vào game đang chọn. Trong danh sách một game, **Gỡ khỏi game** giữ từ ở các game còn dùng. Sau khi soạn thay đổi, chọn **Kiểm tra bản nháp** rồi **Xuất bản**. Với Excel, sao chép ba cột chữ Hán, pinyin và nghĩa vào mục **Dán từ Excel**. Các dòng dán chung một lần dùng cùng cấp độ, bài và game đã chọn.

Với **Tiệm nhỏ tiếng Trung**, chọn game rồi chọn một trong năm chủ đề: Tiệm trà sữa, Cửa hàng quần áo, Ga tàu, Quán ăn hoặc Thư viện. Nhập câu tiếng Trung, nghĩa và đáp án theo form của chủ đề. Mục **Xem câu đã xuất bản** hiển thị danh sách của chủ đề đang chọn. Nội dung mới được dùng khi mở lại game hoặc tạo phòng Solo mới. Bản nháp lưu trên trình duyệt đang dùng.

Máy chủ đọc tài khoản từ `LESSON_ADMIN_USERNAME` và `LESSON_ADMIN_PASSWORD`. Khi chạy local, đặt hai biến trong `.env` và chạy Worker cùng Vite. Trên Cloudflare, đặt chúng dưới dạng Worker secrets và dùng mật khẩu riêng trước khi mở trang cho giáo viên.

## Nhập dữ liệu gốc bằng Excel

Quy trình dòng lệnh bên dưới dùng để chuẩn bị dữ liệu gốc trong KV. Sau lần xuất bản đầu tiên trên web, bản đã xuất bản trong Durable Object là nguồn dữ liệu của game. Tiếp tục thêm nội dung qua trang quản lý để giữ các mục cô giáo đã nhập.

1. Điền file Excel theo mẫu [`mau-tu-vung.xlsx`](mau-tu-vung.xlsx) (tạo lại bằng `npm run content -- template`).
2. Kiểm tra: `npm run content -- check <file.xlsx>` — liệt kê lỗi theo trang và số dòng.
3. Chuyển đổi: `npm run content -- build <file.xlsx>` — ghi `content/content.json`. Còn lỗi thì không ghi.
4. Xem thử trên máy: `npm run dev`, mở game (dev server đọc `content/content.json`).
5. Đưa dữ liệu gốc lên bằng `npm run content -- upload`. Lệnh ghi vào Cloudflare KV (`CONTENT`, khoá `content`).
6. Commit `content/content.json` để giữ lịch sử từng lần cập nhật.

Nếu Cloudflare chưa có dữ liệu hoặc tải lỗi, game dùng bộ mẫu trong `src/content/sample.ts`.

## Trang "Từ vựng"

| Cột     | Bắt buộc | Ghi chú                                                                                                    |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| Cấp độ  | có       | Ví dụ `HSK 1`. Viết giống nhau trong cùng cấp độ; tên này hiện trong game và tạo link `?cap=hsk-1`.        |
| Bài     | có       | Số nguyên từ 1.                                                                                            |
| Tên bài | không    | Chỉ cần ở một dòng của bài; dòng khác để trống.                                                            |
| Chữ Hán | có       | Chỉ chữ Hán, không dấu cách.                                                                               |
| Pinyin  | có       | Có dấu thanh.                                                                                              |
| Nghĩa   | có       | Tiếng Việt, ngắn gọn (hiện trên ô và trong đề bài).                                                        |
| Game    | không    | Trống = mọi game. Giới hạn: `ghep-chu`, `noi-tu`, `chem-hoa-qua`, `rong-san-chu`, cách nhau bằng dấu phẩy. |

Ghép chữ thành từ chỉ dùng từ **đúng 2 chữ**. Chém hoa quả cần **ít nhất 3 từ**, các game khác ít nhất 2; bài quá ít từ bị làm mờ, vẫn chơi được ở "Ôn bài 1–N". Cùng một chữ Hán lặp lại trong một bài thì dòng sau bị bỏ qua (cảnh báo).

## Trang "Ghép động từ" (Chém hoa quả)

Cấp độ, Bài, Danh từ, Động từ đúng, Động từ sai 1, Động từ sai 2, Pinyin (cả cụm), Nghĩa (cả cụm). Ba động từ phải khác nhau. Bài không có cụm nào thì lựa chọn "Ghép động từ" bị tắt ở bài đó.

## Link theo bài

`/games/<game>?cap=<cấp-độ>&bai=<số bài>` mở thẳng một bài; thêm `&on=1` để ôn từ bài 1 đến bài đó. Ví dụ `/games/rong-san-chu?cap=hsk-1&bai=3&on=1`. Link sai hoặc bài đã bị xoá thì game mở phần Tổng hợp của cấp độ.

## Ai đọc được dữ liệu

`/api/content` là công khai: game chạy trên trình duyệt nên người chơi luôn tải được từ vựng đang chơi. Chỉ đưa bài mẫu / học thử vào đây; nội dung khóa trả phí cần đăng nhập (chưa làm).
