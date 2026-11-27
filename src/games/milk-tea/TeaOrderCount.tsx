import { Select } from '../../components/Select';
import { TEA_MAX_ORDERS } from './orders';

const orderCounts = Array.from({ length: TEA_MAX_ORDERS }, (_, index) => index + 1);

export function TeaOrderCount({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange(count: number): void;
}) {
  return (
    <div className="tea-order-count">
      <label htmlFor={id}>Số đơn</label>
      <Select
        id={id}
        aria-label="Số đơn"
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      >
        {orderCounts.map((count) => (
          <option key={count} value={String(count)}>
            {count} đơn
          </option>
        ))}
      </Select>
    </div>
  );
}
