# Gold Rush — game presentation engine (legacy)

> **Legacy:** tài liệu của bản lớp học cũ (`src/games/gold-rush`, `server`), không còn được import vào entrypoint hiện tại. Bản cũ dùng WebSocket (`ws` / Durable Object), không phải Socket.IO. Game đang chạy xem `WORD_GARDEN.md` và `FRUIT_SLASH.md`.

## Công nghệ và ranh giới

Cướp vàng dùng **Phaser 3.90** cho thế giới 2D: canvas WebGL (Canvas fallback), sprite, scene, tương tác con trỏ, tween, flash, coin particles và confetti. React giữ HUD, câu hỏi, nút bàn phím / cảm ứng, sảnh chờ và bảng kết quả. WebSocket server quyết định toàn bộ luật, đáp án và số vàng.

Không gửi loại phần thưởng hay số vàng từ engine lên server. Server chọn phần thưởng sau đáp án đúng; ba rương là cách trình bày lựa chọn may mắn cho cùng lượt thưởng đang chờ. Chỉ `claim` hợp lệ mới cộng vàng / cướp / nhận lá chắn.

## Mã nguồn

- `src/games/gold-rush/TreasureScene.ts`: preload → create → sync; bản đồ, căn cứ, hoạt ảnh, resize và vòng đời engine.
- `src/games/gold-rush/Arena.tsx`: React bridge, lazy import, giữ callback mới nhất, hủy Game khi unmount.
- `src/games/gold-rush/assets.ts`: tài nguyên SVG gốc thuộc codebase, rasterize thành texture một lần. Không dùng emoji cho thế giới game. XML entities giữ đúng chữ Hán qua loader.
- `src/games/gold-rush/game.css`: giao diện game riêng, không phụ thuộc bố cục dashboard.
- `src/games/gold-rush/useGameAudio.ts`: âm thanh tổng hợp Web Audio, mặc định tắt, đóng AudioContext khi rời game.
- `src/pages/RoomPage.tsx`: điều phối view lobby / playing / finished và action server.

## Vòng đời

`Arena` mount → import engine → tạo Game / Scene → preload texture → nhận `RoomView` mới nhất. Các bản cập nhật sau chỉ đồng bộ view, không dựng lại Game. So sánh vàng mới/cũ để bay xu từ kho bị mất đến kho nhận; cộng thường bay từ khu kho báu trung tâm. Đổi lượt pending tạo ba rương mới. Mở rương khóa các lựa chọn còn lại và gọi callback sau hoạt ảnh; nhận thưởng vẫn cần ack của server.

Thoát phòng hủy Phaser Game, tween và canvas. Đổi kích thước dùng `Phaser.Scale.RESIZE`; các phần tử giao diện vẫn là DOM rõ chữ. Trên điện thoại, các đảo nhỏ được ẩn trong lượt học viên để tránh che tiêu đề / câu hỏi. Chế độ giảm chuyển động tắt các hoạt ảnh trang trí, flash và confetti. Engine tải riêng khi vào phòng, bundle lớn hơn giao diện web thông thường là đánh đổi có chủ ý.

## Mở rộng

Thay art SVG bằng sprite atlas trong `preload` khi có bộ hình chuyên nghiệp, giữ nguyên scene và network bridge. Không đưa luật tính vàng vào `update` hoặc tween callbacks. Khi thêm game khác, tạo scene và bridge riêng; dùng chung giao thức phòng sau khi tổng quát hóa state machine.

## Tham chiếu chính thức

- [Phaser Scenes](https://docs.phaser.io/phaser/concepts/scenes)
- [Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager)
- [Tweens](https://docs.phaser.io/phaser/concepts/tweens)
