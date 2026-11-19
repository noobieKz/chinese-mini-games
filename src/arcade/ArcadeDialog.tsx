import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function ArcadeDialog({
  title,
  close,
  children,
}: {
  title: string;
  close(): void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="arcade-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <span className="arcade-kicker">HANPLAY / TÙY CHỈNH</span>
        <button className="arcade-icon" aria-label={`Đóng ${title.toLowerCase()}`} onClick={close}>
          <X size={20} />
        </button>
        <h2 id={titleId}>{title}</h2>
      </header>
      {children}
    </dialog>
  );
}
