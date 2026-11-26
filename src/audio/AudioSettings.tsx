import { useEffect, useRef } from 'react';
import { Music2, Settings2, Swords, Volume2, X } from 'lucide-react';
import type { AudioChannel, GameAudioSettings, GameSound } from './GameAudio';
import type { AudioProfile } from './profiles';
import './settings.css';

export function AudioSettings({
  settings,
  change,
  play,
  close,
  profile,
}: {
  settings: GameAudioSettings;
  change(key: keyof GameAudioSettings, patch: Partial<GameAudioSettings['master']>): void;
  play(kind: GameSound): void;
  close(): void;
  profile: AudioProfile;
}) {
  const controls: {
    channel: AudioChannel | 'master';
    title: string;
    description: string;
    sample?: GameSound;
  }[] = [
    { channel: 'master', title: 'Âm lượng tổng', description: 'Điều khiển toàn bộ âm thanh' },
    ...profile.controls,
  ];
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="game-audio-settings"
      aria-labelledby="game-audio-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <button className="game-audio-close" aria-label="Đóng cài đặt âm thanh" onClick={close}>
        <X size={20} />
      </button>
      <span className="game-audio-eyebrow">
        <Settings2 size={15} /> CHỈNH NHỊP CUỘC CHƠI
      </span>
      <h2 id="game-audio-title">Âm thanh của bạn</h2>
      <p className="game-audio-description">{profile.description}</p>
      {controls.map(({ channel: key, title, description, sample }) => {
        const level = settings[key];
        return (
          <section className={`game-audio-row ${key === 'master' ? 'is-master' : ''}`} key={key}>
            <div className="game-audio-row-heading">
              <span className="game-audio-symbol">
                {key === 'music' ? (
                  <Music2 size={20} />
                ) : key === 'swing' || key === 'slice' ? (
                  <Swords size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </span>
              <div>
                <label htmlFor={`game-volume-${key}`}>{title}</label>
                <small>{description}</small>
              </div>
              <button
                type="button"
                role="switch"
                aria-label={`Bật ${title.toLowerCase()}`}
                aria-checked={level.enabled}
                className="game-audio-switch"
                onClick={() => change(key, { enabled: !level.enabled })}
              >
                <span />
              </button>
            </div>
            <div className="game-audio-range">
              <input
                id={`game-volume-${key}`}
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(level.volume * 100)}
                disabled={!level.enabled}
                aria-valuetext={`${Math.round(level.volume * 100)} phần trăm`}
                onChange={(event) => change(key, { volume: Number(event.target.value) / 100 })}
              />
              <output htmlFor={`game-volume-${key}`}>{Math.round(level.volume * 100)}%</output>
              {sample && (
                <button
                  className="game-audio-preview"
                  disabled={!settings.master.enabled || !level.enabled || !level.volume}
                  aria-label={`Nghe thử ${title.toLowerCase()}`}
                  onClick={() => play(sample)}
                >
                  Thử
                </button>
              )}
            </div>
          </section>
        );
      })}
      <p className="game-audio-note">Tự lưu trên thiết bị này · Chuyển tab sẽ ngừng âm thanh.</p>
      <button className="game-audio-done" onClick={close}>
        XONG RỒI
      </button>
    </dialog>
  );
}
