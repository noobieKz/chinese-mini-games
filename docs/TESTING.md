# Kiểm tra trước buổi học

## Kết quả xác minh v1

Ngày 13/11/2026: build production và TypeScript strict đạt; 8 test đạt. Đã thử luồng tạo phòng → học viên tham gia → bắt đầu → trả lời đúng → nhận 100 vàng → kết thúc và đồng bộ kết quả bằng hai tab trình duyệt độc lập. Đã xem UI desktop 1440px, UI học viên / trang chủ mobile 390px và trình soạn câu hỏi. Mobile không tràn ngang. Chưa kiểm tra trên điện thoại vật lý hoặc tải đủ 60 người.

## Bổ sung: phiên bản Phaser

Đã chạy build production và 8 test sau thay đổi engine. Kiểm tra bằng hai tab: tạo phòng mới, tham gia đội, trả lời đúng, mở một trong ba rương, nhận 100 vàng và cập nhật kho; giáo viên kết thúc ván và học viên thấy đội thắng. Một ván khác đã kiểm tra lá chắn và tự kết thúc khi hết giờ. Reload phục hồi pending reward; rời phòng trả số canvas về 0. Màn câu hỏi, chọn rương và kết quả được xem ở mobile 390px, không tràn ngang. Ảnh xác minh có tiền tố `docs/screenshots/game-engine-`.

Chưa đo FPS / bộ nhớ trên điện thoại vật lý; chưa kiểm tra tải 60 máy hoặc kiểm chứng âm thanh bằng nghe trực tiếp. Nút bật/tắt âm thanh hoạt động qua UI; Web Audio là tính năng tùy chọn.

## Tự động

`npm test`: luật vàng / cướp / lá chắn và socket tích hợp. `npm run build`: TypeScript strict và Vite production build.

## Thủ công

- Desktop: trang thư viện, tìm game, lọc, mở hướng dẫn và đóng modal bằng Escape.
- Mobile 390px: không tràn ngang, câu hỏi / đáp án đủ lớn để chạm, menu mở đóng, modal cuộn được.
- Tạo phòng ở tab giáo viên; mở tab học viên riêng, nhập mã và tên.
- Thêm học viên: đội được phân cân bằng, giáo viên thấy danh sách trực tiếp.
- Chỉ giáo viên bắt đầu / kết thúc; không bắt đầu phòng rỗng.
- Câu đúng → phản hồi → phần thưởng; câu sai → đáp án → câu tiếp theo.
- Cướp đội khác; vàng không âm; lá chắn chặn một lần rồi biến mất.
- Hoàn thành bộ câu hỏi: màn hình cổ vũ, không lặp câu để kiếm vàng.
- Reload cùng tab: giữ vai trò và tiến độ. Mất Wi-Fi: trạng thái kết nối đổi, nối lại phục hồi phòng.
- Hết giờ hoặc kết thúc sớm: cả lớp thấy kết quả, trường hợp hòa hiện đủ đội thắng.
- Tự soạn 4 câu, lưu, reload; xuất JSON rồi nhập lại; tệp sai không làm hỏng giao diện.

Chưa kiểm thử tải 60 thiết bị và chưa có kiểm chứng nội dung giáo trình ngoài bộ mẫu. Khi tổ chức buổi đầu nên thử một ván ngắn với 2–3 thiết bị thật.
