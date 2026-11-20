# Solo 2 người · Đối kháng trên cùng một bàn

Chế độ thêm cho cả 4 game. **Chế độ 1 người không đổi**: solo nằm ở trang, bàn vẽ và server riêng; các file của game 1 người (`WordGarden.tsx`, `GardenScene.ts`, `rules.ts`, `garden.css`, `FruitSlash.tsx`, `FruitScene.ts`, `questions.ts`, `art.ts`, `fruit.css`, `DragonWords.tsx`, `DragonScene.ts`, `model.ts`, `dragon.css`…) không bị sửa, solo chỉ đọc lại hàm/kiểu từ đó.

## Người chơi thấy gì

- Sảnh: bấm một game → hộp chọn **1 người** (vào trang cũ) hoặc **Solo 2 người**. Ctrl/Cmd+click vẫn mở thẳng chế độ 1 người.
- `/games/solo?tro=<game>`: tạo phòng (trò chơi, cấp độ/bài, 2 tuỳ chọn riêng của game) hoặc nhập mã. Link mời: `/games/solo?ma=XXXXXX`; người vào bằng link tự nhận đúng game của phòng.
- Phòng chờ: mã 6 ký tự (không có 0/O/1/I/L), chép link, đổi tên, hai thẻ ghế, nút Sẵn sàng. Cả hai sẵn sàng → đếm ngược 3 giây.
- Kết thúc: nhiều điểm hơn thắng, bằng điểm hòa. Mất kết nối được giữ ghế 20 giây, quá hạn thì đối thủ thắng. **Đấu lại** = ván mới, cùng thiết lập.

### Ghép chữ / Nối nghĩa (Pikachu)

Một bàn chung, luôn 4 cột. Cặp ai nối được biến mất ở cả hai bên. Đúng +10, sai −2 (không âm), chậm hơn đối thủ ở cùng cặp: không trừ. Từ có thật ngoài bàn không trừ. Ô mình đang chọn chỉ hiện trên máy mình. Bàn hết đường thì server tự đảo. Hết bàn hoặc 5 phút.

### Chém hoa quả

Cùng một câu hỏi, cùng **4 quả** (bản 1 người giữ 3 quả; quả thứ 4 là mận tím, vẽ riêng trong `FruitDuelScene.ts`). Ai chém đúng trước +10, quả vỡ ở cả hai bên. Chém sai −2 và bị khoá câu đó (quả mờ đi), đối thủ vẫn chém tiếp; cả hai sai hoặc hết giờ thì không ai được điểm. Đáp án chỉ gửi xuống máy khi câu đã xong. 12 câu, 8 hoặc 12 giây mỗi câu. Cụm động từ: 2 đáp án sai từ bảng tính + 1 động từ của cụm khác.

### Rồng săn chữ

Bàn 14×14 (vuông, cùng một bàn cho điện thoại và máy tính), đi xuyên mép. Hai rồng (của mình màu đỏ, đối thủ màu xanh), chung một từ và chung các viên chữ. Ăn đúng chữ kế tiếp +5, chữ cuối của từ thêm +10. Ăn sai chữ −3 (viên chữ hiện lại chỗ khác). Đâm vào thân rồng (mình hay đối thủ) hoặc đối đầu −3 và hồi sinh dài 3 ô ở chỗ trống, nhấp nháy và đi xuyên mọi thứ trong 8 bước. 2 hoặc 3 phút; tốc độ chậm/vừa/nhanh = 260/210/170 ms một bước. Rẽ khi đầu rồng đã quá nửa ô thì rẽ từ ô kế tiếp (giống bản 1 người); hàng rẽ đang chờ không gửi cho đối thủ.

## Kiến trúc

| Phần                                                  | File                                                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Phần chung: mã phòng, ghế, sẵn sàng, kết quả, đấu lại | `src/games/duel/core.ts`                                                                                                      |
| Luật từng game (thuần, có test)                       | `src/games/word-garden/duel.ts`, `src/games/duel/fruit-rules.ts`, `dragon-rules.ts`                                           |
| Một giao diện cho trọng tài                           | `src/games/duel/engines.ts`                                                                                                   |
| Trọng tài: Durable Object, một phòng = một object     | `cloudflare/duel-room.ts` (binding `DUEL`, migration `v2`)                                                                    |
| API                                                   | `POST /api/duel` tạo phòng (`game`: garden/fruit/dragon), `GET /api/duel/<MÃ>` WebSocket                                      |
| Trang solo (tạo/vào phòng, phòng chờ, kết quả, luật)  | `src/games/duel/DuelPage.tsx`, `duel.css`                                                                                     |
| Bàn từng game (chỉ hiển thị)                          | `GardenDuelView.tsx` + `DuelScene.ts`, `FruitDuelView.tsx` + `FruitDuelScene.ts`, `DragonDuelView.tsx` + `DragonDuelScene.ts` |
| Kết nối, tự nối lại                                   | `src/games/duel/useDuelRoom.ts`                                                                                               |
| Hộp chọn chế độ                                       | `src/arcade/Lobby.tsx`                                                                                                        |

Server là trọng tài: giữ bàn, xử lý lượt theo thứ tự đến, gửi toàn bộ trạng thái sau mỗi thay đổi. Hạn giờ (hết giờ, câu tiếp theo, bước của rồng) chạy bằng bộ hẹn giờ trong bộ nhớ của Durable Object; báo thức lưu trữ (alarm) chỉ là dự phòng khi object bị khởi động lại, nên không ghi alarm mỗi bước. Trận rồng ghi trạng thái tối đa 2 giây một lần. WebSocket dùng hibernation nên phòng rảnh không tốn chi phí; phòng không ai dùng 2 giờ bị xoá.

## Chạy thử trên máy

1. `npm run build` rồi `npx wrangler dev --port 8788 --local` (Durable Object chạy trong wrangler).
2. `npm run dev`: Vite chuyển `/api/duel` sang cổng 8788.
3. Mở hai tab (mỗi tab là một người chơi), hoặc chạy hai người chơi giả lập: `npx tsx scripts/smoke-duel.ts` (Pikachu) và `npx tsx scripts/smoke-duel-games.ts` (Chém hoa quả, Rồng).
4. Chỉ để **một** `wrangler dev` chạy: dừng lệnh cũ trước khi chạy lại (trên Windows, tiến trình `wrangler`/`workerd` cũ có thể còn sống và giữ cổng 8788, làm mọi request bị treo).

Đã thử: cả ba loại phòng qua server thật (tạo, vào bằng link, sẵn sàng, tranh câu/cặp/chữ, hết giờ, kết quả, đấu lại); giao diện ở máy tính và điện thoại. Chưa thử trên hai thiết bị thật qua mạng di động (độ trễ mạng sẽ ảnh hưởng rõ nhất ở Rồng).
