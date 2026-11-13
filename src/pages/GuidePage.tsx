import { ArrowRight, Shield, Wifi } from 'lucide-react';

export function GuidePage({ openCreate }: { openCreate: (id?: string) => void }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CHỈ VÀI BƯỚC THẬT ĐƠN GIẢN</div>
          <h1>Mở cuộc chơi, kết nối cả lớp.</h1>
          <p>Không cần tài khoản học viên. Chỉ cần điện thoại và tinh thần đồng đội.</p>
        </div>
      </div>
      <div className="guide-grid">
        {[
          [
            '01',
            'Chuẩn bị bài học',
            'Chọn bộ câu hỏi mẫu hoặc tự tạo trong mục Bộ câu hỏi. Mỗi bộ cần ít nhất 4 câu, mỗi câu có 4 đáp án.',
          ],
          [
            '02',
            'Tạo một phòng chơi',
            'Chọn Cướp vàng, bộ câu hỏi, số đội và thời gian. Chia sẻ mã phòng 6 số hoặc sao chép liên kết mời.',
          ],
          [
            '03',
            'Cả lớp cùng tham gia',
            'Học viên mở cùng địa chỉ website, nhập tên và mã phòng. Hệ thống tự chia đều vào 2–4 đội.',
          ],
          [
            '04',
            'Học, chơi và ăn mừng',
            'Giáo viên bắt đầu. Học viên trả lời trên điện thoại, mở rương và góp vàng cho đội. Hết giờ, cùng xem kết quả!',
          ],
        ].map(([n, t, d]) => (
          <article className="guide-card" key={n}>
            <span>{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </div>
      <section className="guide-note">
        <Wifi size={25} />
        <div>
          <h3>Chơi trên điện thoại trong lớp</h3>
          <p>
            Khi chạy trên máy giáo viên, cho cả lớp dùng cùng Wi-Fi và mở địa chỉ IP mạng nội bộ của
            máy đó. Địa chỉ localhost chỉ dùng được trên chính máy đang chạy web. Khi có hosting,
            học viên chỉ cần mở đường dẫn website.
          </p>
        </div>
      </section>
      <section className="guide-note">
        <Shield size={25} />
        <div>
          <h3>Hiểu luật để chơi công bằng</h3>
          <p>
            Trả lời đúng: 60% nhận 100 vàng, 25% có lượt cướp tối đa 150 vàng, 15% nhận lá chắn. Lá
            chắn chặn một lượt cướp và không cộng dồn. Trả lời sai không mất vàng và được xem đáp
            án. Mỗi câu chỉ trả lời một lần; hết câu thì cổ vũ đồng đội. Hòa vàng thì cùng chiến
            thắng.
          </p>
        </div>
      </section>
      <button className="button primary" onClick={() => openCreate()}>
        Tạo phòng đầu tiên
        <ArrowRight size={17} />
      </button>
    </>
  );
}
