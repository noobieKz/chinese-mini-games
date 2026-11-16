import { useEffect, useRef, useState } from 'react';
import { GameAudio, loadMusicAsset, readAudioSettings, type GameAudioSettings } from './GameAudio';
import type { AudioProfile } from './profiles';

export function useGameSound(profile: AudioProfile) {
  const [settings, setSettings] = useState(() => {
    try {
      return readAudioSettings(localStorage.getItem(profile.storageKey));
    } catch {
      return readAudioSettings(null);
    }
  });
  const mixer = useRef<GameAudio | null>(null);
  useEffect(() => {
    const audio = new GameAudio(settings, (context) => loadMusicAsset(context, profile.music.url));
    mixer.current = audio;
    const unlock = () => audio.unlock();
    const visibility = () => audio.visibility(!document.hidden);
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      mixer.current = null;
      audio.destroy();
    };
    // Mixer lifetime follows the game; preference updates use its gain buses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    mixer.current?.update(settings);
    try {
      localStorage.setItem(profile.storageKey, JSON.stringify(settings));
    } catch {
      /* Optional persistence. */
    }
  }, [settings]);
  const change = (key: keyof GameAudioSettings, patch: Partial<GameAudioSettings['master']>) => {
    setSettings((previous) => ({ ...previous, [key]: { ...previous[key], ...patch } }));
  };
  return {
    settings,
    change,
    play: (kind: Parameters<GameAudio['play']>[0]) => mixer.current?.play(kind),
  };
}
