import { Select } from '../../components/Select';
import { topicIds, topics, type TopicId } from './orders';

export function TopicPicker({
  id,
  label = 'Chủ đề',
  value,
  onChange,
}: {
  id: string;
  label?: string;
  value: TopicId | '';
  onChange(topic: TopicId): void;
}) {
  return (
    <div className="tea-topic-field">
      <label htmlFor={id}>{label}</label>
      <Select
        id={id}
        aria-label={label}
        value={value}
        onValueChange={(next) => {
          const topic = topicIds.find((id) => id === next);
          if (topic) onChange(topic);
        }}
      >
        <option value="" disabled>
          Chọn chủ đề
        </option>
        {topicIds.map((topic) => (
          <option key={topic} value={topic}>
            {topics[topic].name}
          </option>
        ))}
      </Select>
    </div>
  );
}
