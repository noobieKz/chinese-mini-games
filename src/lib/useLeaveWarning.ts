import { useEffect, useRef } from 'react';

let warning: (() => boolean) | null = null;
export const confirmLeave = () => warning?.() ?? true;

/** Warn before browser navigation; no game state is saved. */
export function useLeaveWarning(playing: boolean, pause: () => void) {
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  useEffect(() => {
    if (!playing) return;
    const confirm = () => {
      pauseRef.current();
      return window.confirm('Rời lượt chơi này? Tiến độ lượt đang chơi sẽ bị mất.');
    };
    const unload = (event: BeforeUnloadEvent) => {
      pauseRef.current();
      event.preventDefault();
      event.returnValue = '';
    };
    warning = confirm;
    window.addEventListener('beforeunload', unload);
    return () => {
      if (warning === confirm) warning = null;
      window.removeEventListener('beforeunload', unload);
    };
  }, [playing]);
}
