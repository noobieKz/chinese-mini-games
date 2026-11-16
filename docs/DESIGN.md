# Thiết kế HanPlay · Vườn chữ

## Phạm vi

Chơi cá nhân, mở link là chơi. Không đăng nhập, không phòng, không bảng thi đấu. Landing page khóa học chưa triển khai. Thư viện luôn có đường dẫn `/games` để không phụ thuộc trang chủ tương lai.

## Hướng hình ảnh

Vườn chữ: nền giấy ấm, xanh ngọc, ô ngà nổi, màu vàng cho ô được chọn/được gợi ý. Không đặt chữ học tập trên tranh nền. Bàn chơi được vẽ bằng Phaser Graphics, Text và tween; không phải ảnh nền giả engine. Hoạt ảnh ngắn, có hỗ trợ reduced motion. Âm thanh mặc định bật (nhạc nền 18%, phát sau lần chạm đầu tiên); người chơi tắt hoặc chỉnh từng kênh trong cài đặt âm thanh (icon loa).

Tham khảo nguyên tắc evondevKit tại https://evondev-uiux.vercel.app/ và `skills/ui-ux/references/principles.md` trong repo evondev/evondevKit: bố cục giữ ổn định khi đổi trạng thái, trạng thái luôn có chữ, điều khiển cùng vai dùng chung mẫu, tương phản dễ đọc. Chỉ tham khảo, không cài skill hoặc thư viện UI từ nguồn đó. Phần bàn game được thiết kế theo nhu cầu riêng, không dùng khung dashboard.

## Thứ bậc

1. Điều hướng về thư viện, tên sản phẩm, hướng dẫn/âm thanh/toàn màn hình.
2. Tên game và mô tả ngắn.
3. HUD điểm, thời gian/chế độ, số cặp ghép.
4. Bàn engine ở giữa; công cụ nằm bên dưới, không thay chỗ với đáp án.
5. Thiết lập và sổ tay bên phải desktop, dưới bàn trên mobile.

Desktop/tablet: 6 cột × 4 hàng. Điện thoại: 4 cột × 6 hàng, giữ chữ và vùng chạm đủ lớn. Resize bố trí lại scene, giữ tiến độ. Overlay có nền đặc, che và khóa bàn. Tất cả điều khiển dùng nút DOM để hỗ trợ chuột, cảm ứng, Tab/Enter; canvas chỉ trình bày để tránh một cử chỉ đi vào cả hai hệ input.

## Trạng thái

Đang tải, lỗi tải và thử lại; trước khi chơi; đã chọn ô; sai cặp/không có đường; ghép đúng; bàn hết đường tự đảo; tạm dừng; hướng dẫn; xác nhận rời; hết giờ; thắng. Trong animation xử lý cặp, input bị khóa đồng bộ trong engine. Double-click không chọn ô thứ hai. Không thay màn ở pointerdown.

## Token

Font: Be Vietnam Pro và Noto Sans SC, fallback sans-serif. Nền #f5f3ea, mặt đọc #fffdf7, chữ #25483d, chữ phụ #62746a, nút chính #285b48. Font tải từ Google Fonts; nếu không có mạng dùng font hệ thống. Game dùng engine local trong bundle, không yêu cầu API hoặc quyền camera.

## Cập nhật cách render và tùy chọn

Chữ đọc trong ô chuyển sang HTML/CSS native để tránh mờ do scale canvas. Phaser chỉ vẽ nền ô và hiệu ứng. `layout.ts` là nguồn chung cho vị trí ô DOM, scene và rãnh đường nối. Đường viền ngoài được vẽ bên trong canvas thay vì dùng tọa độ âm.

Độ khó được chốt Bình thường/Khó, mặc định Bình thường. Nội dung chi tiết tại WORD_GARDEN.md. Dropdown dùng component chung chuyển từ dự án classroom-management; không cài thư viện UI mới.
