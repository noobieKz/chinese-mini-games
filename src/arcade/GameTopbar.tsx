import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Maximize2,
  Settings2,
  Trophy,
  Volume2,
} from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  best?: number;
  onBack(): void;
  onHelp(): void;
  onSound(): void;
  onFullscreen(): void;
  onSettings?(): void;
  onNotebook?(): void;
  settingsDisabled?: boolean;
};

/** Compact game chrome, shared by every arena. The stage owns the rest of the viewport. */
export function GameTopbar({
  title,
  subtitle,
  best,
  onBack,
  onHelp,
  onSound,
  onFullscreen,
  onSettings,
  onNotebook,
  settingsDisabled,
}: Props) {
  return (
    <header className="arcade-topbar">
      <button
        className="arcade-icon arcade-exit"
        onClick={onBack}
        aria-label="Về sảnh game"
        title="Về sảnh game"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="arcade-game-name">
        <img src="/favicon.svg" alt="" />
        <div>
          <strong>{title}</strong>
          <small>{subtitle || 'HANPLAY ARCADE'}</small>
        </div>
      </div>
      <div className="arcade-topbar-actions">
        {best !== undefined && (
          <span className="arcade-record" title="Kỷ lục lưu trên thiết bị">
            <Trophy size={16} />
            <b>{best}</b>
          </span>
        )}
        {onNotebook && (
          <button
            className="arcade-icon"
            onClick={onNotebook}
            aria-label="Sổ tay từ vựng"
            title="Sổ tay từ vựng"
          >
            <BookOpen size={18} />
          </button>
        )}
        {onSettings && (
          <button
            className="arcade-icon"
            onClick={onSettings}
            disabled={settingsDisabled}
            aria-label="Thiết lập lượt chơi"
            title={settingsDisabled ? 'Đổi thiết lập ở lượt mới' : 'Thiết lập lượt chơi'}
          >
            <Settings2 size={18} />
          </button>
        )}
        <button className="arcade-icon" onClick={onHelp} aria-label="Hướng dẫn" title="Hướng dẫn">
          <HelpCircle size={18} />
        </button>
        <button
          className="arcade-icon"
          onClick={onSound}
          aria-label="Cài đặt âm thanh"
          title="Âm thanh"
        >
          <Volume2 size={18} />
        </button>
        <button
          className="arcade-icon arcade-fullscreen"
          onClick={onFullscreen}
          aria-label="Toàn màn hình"
          title="Toàn màn hình"
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </header>
  );
}
