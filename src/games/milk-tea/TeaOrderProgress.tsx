import { Check, X } from 'lucide-react';

export function TeaOrderProgress({
  total,
  results,
  submitted = results.length,
  active = false,
}: {
  total: number;
  results: readonly (boolean | null)[];
  submitted?: number;
  active?: boolean;
}) {
  if (!total) return null;

  return (
    <ol className="tea-order-progress" aria-label="Tiến độ từng đơn">
      {Array.from({ length: total }, (_, index) => {
        const result = results[index];
        const current = active && index === submitted;
        const status =
          result === true
            ? 'Đúng'
            : result === false
              ? 'Sai'
              : current
                ? 'Đang pha'
                : index < submitted
                  ? 'Đã giao'
                  : 'Chưa pha';
        return (
          <li
            key={index}
            aria-current={current ? 'step' : undefined}
            data-result={result === true ? 'correct' : result === false ? 'wrong' : undefined}
            title={`Đơn ${index + 1}: ${status}`}
          >
            <span className="tea-order-label">Đơn </span>
            {index + 1}
            {result === true && <Check size={13} aria-hidden="true" />}
            {result === false && <X size={13} aria-hidden="true" />}
            <span className="tea-order-label">: {status}</span>
          </li>
        );
      })}
    </ol>
  );
}
