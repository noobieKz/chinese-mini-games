import { useEffect, useRef, useState } from 'react';
export function useGameAudio() {
  const [enabled, setEnabled] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const getContext = () => (context.current ??= new AudioContext());
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  const play = (kind: 'correct' | 'wrong' | 'treasure' | 'click') => {
    if (!enabled) return;
    try {
      const audio = getContext();
      const schedule = () => {
        const notes =
          kind === 'correct'
            ? [523, 659, 784]
            : kind === 'treasure'
              ? [659, 784, 988, 1318]
              : kind === 'wrong'
                ? [330, 196]
                : [440];
        notes.forEach((frequency, i) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          const t = audio.currentTime + i * (kind === 'wrong' ? 0.16 : 0.09);
          oscillator.type = kind === 'wrong' ? 'triangle' : 'sine';
          oscillator.frequency.setValueAtTime(frequency, t);
          if (kind === 'wrong')
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.75, t + 0.22);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(kind === 'wrong' ? 0.12 : 0.075, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start(t);
          oscillator.stop(t + 0.31);
        });
      };
      if (audio.state === 'running') schedule();
      else
        void audio
          .resume()
          .then(schedule)
          .catch(() => {});
    } catch {
      /* Optional sound. */
    }
  };
  const toggle = () => {
    if (!enabled) {
      try {
        // Unlock audio during the user's click, before later engine callbacks.
        void getContext()
          .resume()
          .catch(() => {});
      } catch {
        /* Optional sound. */
      }
    }
    setEnabled((value) => !value);
  };
  return { enabled, toggle, play };
}
