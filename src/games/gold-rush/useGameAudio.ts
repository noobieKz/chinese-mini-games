import { useEffect, useRef, useState } from 'react';
export function useGameAudio() {
  const [enabled, setEnabled] = useState(false);
  const context = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  const play = (kind: 'correct' | 'wrong' | 'treasure' | 'click') => {
    if (!enabled) return;
    try {
      const audio = (context.current ??= new AudioContext());
      void audio.resume().catch(() => {});
      const notes =
        kind === 'correct'
          ? [523, 659, 784]
          : kind === 'treasure'
            ? [659, 784, 988, 1318]
            : kind === 'wrong'
              ? [294, 247]
              : [440];
      notes.forEach((frequency, i) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const t = audio.currentTime + i * 0.09;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.075, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(t);
        oscillator.stop(t + 0.31);
      });
    } catch {
      /* Optional sound. */
    }
  };
  return { enabled, toggle: () => setEnabled((value) => !value), play };
}
