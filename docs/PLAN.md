# HanPlay — kế hoạch sản phẩm

## Mục tiêu

Website trò chơi tập thể cho lớp tiếng Trung, ưu tiên giáo viên Việt Nam và người học HSK 1–2. Giáo viên mở phòng trên máy chiếu, học viên tham gia bằng điện thoại; mỗi người đóng góp vào đội.

## Phạm vi v1

- [x] Trang khám phá nhiều game, trạng thái sẵn sàng / đang phát triển rõ ràng.
- [x] Cướp vàng: 2–4 đội, tối đa 60 người, ván 1–15 phút.
- [x] Tạo phòng, mã 6 số, liên kết mời, tự cân bằng đội trong phòng chờ.
- [x] Câu hỏi riêng từng học viên, đáp án được kiểm tra ở server.
- [x] Rương: 60% +100 vàng, 25% cướp tối đa 150, 15% lá chắn một lượt.
- [x] Phản hồi đáp án sai, mỗi câu chỉ trả lời một lần.
- [x] Bảng xếp hạng và hoạt động trực tiếp, kết quả cả lớp, hòa cùng thắng.
- [x] Hai bộ câu hỏi mẫu và trình soạn 4–100 câu.
- [x] Nhập / xuất JSON, lưu bộ tự soạn trên trình duyệt.
- [x] Phục hồi phiên sau tải lại trang / mất kết nối ngắn.
- [x] Typecheck, build, unit test và kiểm tra socket tích hợp.

## Quyết định sư phạm

Không đổi toàn bộ kho vàng: giữ sự bất ngờ nhưng tránh lật kết quả quá mạnh. Không trừ vàng khi sai; cung cấp đáp án để người học tiếp thu. Không lặp câu hỏi trong cùng ván để tránh cày điểm từ đáp án đã biết. Hoàn thành sớm thì cổ vũ đội. Giáo viên chọn thời lượng phù hợp với độ dài bộ câu hỏi.

## Lộ trình sau v1

1. Lưu ngân hàng câu hỏi và lịch sử ván vào database, tài khoản giáo viên.
2. Thống kê lỗi theo câu hỏi, xuất kết quả, gán đội thủ công, loại người lạ.
3. Nội dung nghe / ảnh, thư viện câu hỏi theo bài giáo trình.
4. Game Tiếp sức ghép câu rồi Ai là gián điệp; tái sử dụng lobby, teams và ngân hàng câu hỏi.
5. Trước khi mở công khai: TLS, giới hạn tạo phòng theo IP, đăng nhập giáo viên, chính sách dữ liệu học sinh, kiểm thử tải thực tế.

## Điều kiện dùng thực tế

V1 phục vụ lớp học tin cậy, server một tiến trình. Chưa có đăng nhập, database hay triển khai hosting. Số 60 là giới hạn sản phẩm, chưa phải cam kết tải đã đo. Phòng mất khi server khởi động lại; bộ câu hỏi lưu trong trình duyệt cần xuất JSON để sao lưu.
