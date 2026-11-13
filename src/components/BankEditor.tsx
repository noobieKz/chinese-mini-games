import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import type { Bank, Question } from '../../shared/types';
import { Modal } from './Modal';
import { createId } from '../lib/id';
const blank = (): Question => ({
  id: createId(),
  text: '',
  pinyin: '',
  options: ['', '', '', ''],
  answer: 0,
});
export function BankEditor({
  bank,
  onSave,
  onClose,
}: {
  bank?: Bank;
  onSave: (bank: Bank) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(bank?.title ?? '');
  const [questions, setQuestions] = useState<Question[]>(
    bank?.questions.map((q) => ({ ...q, options: [...q.options] })) ??
      Array.from({ length: 4 }, blank),
  );
  const [error, setError] = useState('');
  const update = (i: number, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q, n) => (n === i ? { ...q, ...patch } : q)));
  return (
    <Modal title={bank ? 'Chỉnh sửa bộ câu hỏi' : 'Một bộ câu hỏi mới'} onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            questions.length < 4 ||
            questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))
          )
            return setError('Cần ít nhất 4 câu hỏi, mỗi câu có đủ 4 đáp án.');
          onSave({
            id: bank?.id ?? createId(),
            title: title.trim(),
            description: bank?.description ?? 'Bộ câu hỏi do bạn biên soạn cho lớp học.',
            level: bank?.level ?? 'Tùy chỉnh',
            questions,
          });
        }}
      >
        <label>
          Tên bộ câu hỏi
          <input
            autoFocus
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Bài 3 · Gia đình của tôi"
          />
        </label>
        <p className="muted">
          Chọn nút tròn cạnh đáp án đúng. Nội dung được lưu trên trình duyệt này; bạn có thể xuất
          JSON để sao lưu.
        </p>
        <div className="question-list">
          {questions.map((q, i) => (
            <section className="editor-question" key={q.id}>
              <div className="section-heading">
                <b>Câu {i + 1}</b>
                <button
                  className="icon-button"
                  type="button"
                  disabled={questions.length <= 4}
                  onClick={() => setQuestions((qs) => qs.filter((_, n) => n !== i))}
                  aria-label={`Xóa câu ${i + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <input
                aria-label={`Nội dung câu ${i + 1}`}
                required
                maxLength={500}
                value={q.text}
                onChange={(e) => update(i, { text: e.target.value })}
                placeholder="Nhập câu hỏi tiếng Việt hoặc tiếng Trung…"
              />
              <input
                aria-label={`Pinyin câu ${i + 1}`}
                maxLength={200}
                value={q.pinyin ?? ''}
                onChange={(e) => update(i, { pinyin: e.target.value })}
                placeholder="Pinyin (không bắt buộc)"
              />
              <div className="editor-options">
                {q.options.map((o, n) => (
                  <label key={n}>
                    <input
                      type="radio"
                      name={`answer-${q.id}`}
                      checked={q.answer === n}
                      onChange={() => update(i, { answer: n })}
                      aria-label={`Đáp án ${n + 1} đúng`}
                    />
                    <input
                      aria-label={`Đáp án ${n + 1} câu ${i + 1}`}
                      required
                      maxLength={200}
                      value={o}
                      onChange={(e) =>
                        update(i, {
                          options: q.options.map((v, j) => (j === n ? e.target.value : v)),
                        })
                      }
                      placeholder={`Đáp án ${'ABCD'[n]}`}
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        <button
          className="button secondary"
          type="button"
          disabled={questions.length >= 100}
          onClick={() => setQuestions((qs) => [...qs, blank()])}
        >
          <Plus size={17} />
          Thêm câu hỏi
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer className="modal-actions">
          <span className="muted">{questions.length} / 100 câu hỏi</span>
          <button className="button primary">
            <Save size={17} />
            Lưu bộ câu hỏi
          </button>
        </footer>
      </form>
    </Modal>
  );
}
