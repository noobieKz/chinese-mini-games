import { useEffect, useState } from 'react';
import { ArcadeDialog } from '../../arcade/ArcadeDialog';
import { GameTopbar } from '../../arcade/GameTopbar';
import { AudioSettings } from '../../audio/AudioSettings';
import { useContent } from '../../content/useContent';
import { teaAudioProfile } from '../../audio/profiles';
import { useGameSound } from '../../audio/useGameSound';
import { confirmLeave, useLeaveWarning } from '../../lib/useLeaveWarning';
import {
  describeOrder,
  SCENARIO_GAME_NAME,
  dealOrders,
  matchesOrder,
  TEA_TIME,
  TEA_DEFAULT_ORDERS,
  isFullOrder,
  topics,
  orderControls,
  type TopicId,
  type Order,
  type Recipe,
} from './orders';
import { TeaOrderProgress } from './TeaOrderProgress';
import { TopicPicker } from './TopicPicker';
import { TeaOrderCount } from './TeaOrderCount';
import { TeaStation } from './TeaStation';

export function MilkTea({ onBack }: { onBack(): void }) {
  const [topic, setTopic] = useState<TopicId>('tea');
  const isTea = topic === 'tea';
  const { name } = topics[topic];
  const { labels } = orderControls(topic);
  const example = describeOrder({ size: 1, drink: 0, topping: 1, ice: 1, sugar: 2 }, topic);
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'done'>('lobby');
  const [orderCount, setOrderCount] = useState(TEA_DEFAULT_ORDERS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const progress = results.length;
  const score = results.filter(Boolean).length;
  const [end, setEnd] = useState(0);
  const [seconds, setSeconds] = useState(TEA_TIME / 1000);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    hanzi: string;
    meaning: string;
    pinyin?: string;
  } | null>(null);
  const [help, setHelp] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useGameSound(teaAudioProfile);
  const content = useContent();

  useLeaveWarning(phase === 'playing', () => undefined);
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) setPhase('done');
    }, 120);
    return () => window.clearInterval(timer);
  }, [phase, end]);

  const start = () => {
    setOrders(dealOrders(topic, content?.bundle.scenarios ?? [], Math.random, orderCount));
    setResults([]);
    setFeedback(null);
    setSeconds(TEA_TIME / 1000);
    setEnd(Date.now() + TEA_TIME);
    setPhase('playing');
  };
  const order = orders[progress];
  const serve = (recipe: Recipe) => {
    if (!order || phase !== 'playing' || Date.now() >= end) return;
    const correct = matchesOrder(order, recipe);
    audio.play(correct ? 'correct' : 'wrong');
    setFeedback({ correct, ...describeOrder(order, topic) });
    setResults([...results, correct]);
    if (progress + 1 === orders.length) setPhase('done');
  };
  return (
    <div className="tea-page" data-topic={topic}>
      <GameTopbar
        title={phase === 'lobby' ? SCENARIO_GAME_NAME : name}
        onBack={() => {
          if (confirmLeave()) onBack();
        }}
        onHelp={() => setHelp(true)}
        onSound={() => setSound(true)}
        onFullscreen={() => {
          void (
            document.fullscreenElement
              ? document.exitFullscreen()
              : document.documentElement.requestFullscreen()
          ).catch(() => undefined);
        }}
      />
      <TeaStation
        topic={topic}
        fullOrder={phase === 'playing' && isFullOrder(order)}
        ticket={phase === 'playing' && order ? describeOrder(order, topic).hanzi : undefined}
        progress={progress}
        results={results}
        total={orders.length}
        seconds={seconds}
        score={score}
        feedback={feedback}
        onServe={serve}
      />
      {phase === 'lobby' && !help && !sound && (
        <ArcadeDialog title="Chuẩn bị lượt chơi" close={onBack}>
          <p>
            {isTea
              ? 'Đọc đơn tiếng Trung, chọn ly rồi pha đúng loại trà, topping, đá và đường. Đóng nắp trước khi giao ly.'
              : `Đọc yêu cầu tiếng Trung và chọn đúng các thông tin: ${Object.values(labels).join(', ').toLowerCase()}.`}
          </p>
          <div className="tea-setup-fields">
            <TopicPicker id="practice-topic" value={topic} onChange={setTopic} />
            <TeaOrderCount
              id="tea-practice-order-count"
              value={orderCount}
              onChange={setOrderCount}
            />
          </div>
          <button className="garden-primary" onClick={start} disabled={!content}>
            Bắt đầu · 90 giây
          </button>
        </ArcadeDialog>
      )}
      {phase === 'done' && !help && !sound && (
        <ArcadeDialog title="Kết quả lượt chơi" close={onBack}>
          <p>
            Bạn giao đúng{' '}
            <strong>
              {score}/{progress}
            </strong>{' '}
            đơn.
          </p>
          <TeaOrderProgress total={orders.length} results={results} />
          {feedback && (
            <p>
              <span lang="zh-Hans">{feedback.hanzi}</span> {feedback.meaning}
            </p>
          )}
          <button className="garden-primary" onClick={start}>
            Chơi lại
          </button>
          <button className="garden-text-button" onClick={() => setPhase('lobby')}>
            Đổi chủ đề hoặc số đơn
          </button>
        </ArcadeDialog>
      )}
      {help && (
        <ArcadeDialog title="Cách chơi" close={() => setHelp(false)}>
          <p>
            Ví dụ <span lang="zh-Hans">{example.hanzi}</span> {example.meaning}.
          </p>
          <p>
            {isTea
              ? 'Pha lần lượt theo từng trạm. Bạn có thể chỉnh nguyên liệu hoặc pha lại trước khi giao. Mỗi ly đúng được một điểm.'
              : 'Chọn đủ các mục trên phiếu rồi bấm xác nhận. Mỗi yêu cầu đúng được một điểm.'}
          </p>
        </ArcadeDialog>
      )}
      {sound && (
        <AudioSettings
          profile={teaAudioProfile}
          settings={audio.settings}
          change={audio.change}
          play={audio.play}
          close={() => setSound(false)}
        />
      )}
    </div>
  );
}
