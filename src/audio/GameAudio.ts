export const audioChannels = ['music', 'swing', 'slice', 'feedback', 'selection'] as const;
export type AudioChannel = (typeof audioChannels)[number];
export type GameSound = 'swing' | 'slice' | 'correct' | 'wrong' | 'click' | 'select';
export type AudioLevel = { enabled: boolean; volume: number };
export type GameAudioSettings = Record<AudioChannel | 'master', AudioLevel>;

export async function loadMusicAsset(audio: AudioContext, url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Music unavailable');
  return audio.decodeAudioData(await response.arrayBuffer());
}

export function readAudioSettings(raw: string | null): GameAudioSettings {
  const defaults: GameAudioSettings = {
    master: { enabled: true, volume: 0.8 },
    music: { enabled: true, volume: 0.18 },
    swing: { enabled: true, volume: 0.7 },
    slice: { enabled: true, volume: 0.8 },
    feedback: { enabled: true, volume: 0.7 },
    selection: { enabled: true, volume: 0.55 },
  };
  try {
    const saved = JSON.parse(raw ?? 'null');
    for (const key of ['master', ...audioChannels] as const) {
      const item = saved?.[key];
      if (typeof item?.enabled === 'boolean') defaults[key].enabled = item.enabled;
      if (typeof item?.volume === 'number' && Number.isFinite(item.volume))
        defaults[key].volume = Math.max(0, Math.min(1, item.volume));
    }
  } catch {
    // A corrupt or unavailable preference must not prevent playing.
  }
  return defaults;
}

/** Local music asset and synthesized effects, mixed without autoplay workarounds. */
export class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private buses = {} as Record<AudioChannel, GainNode>;
  private noise?: AudioBuffer;
  private sources = new Set<AudioScheduledSourceNode>();
  private musicSources = new Set<AudioScheduledSourceNode>();
  private musicBuffer?: AudioBuffer;
  private musicLoad?: Promise<void>;
  private musicOffset = 0;
  private musicStartedAt = 0;
  private visible = true;
  private disposed = false;
  constructor(
    private settings: GameAudioSettings,
    private musicLoader: (audio: AudioContext) => Promise<AudioBuffer>,
  ) {}

  unlock() {
    if (this.disposed) return;
    try {
      if (!this.context) {
        const audio = (this.context = new AudioContext());
        this.master = audio.createGain();
        this.master.connect(audio.destination);
        for (const channel of audioChannels) {
          this.buses[channel] = audio.createGain();
          this.buses[channel].connect(this.master);
        }
        this.noise = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.update(this.settings);
      }
      if (this.context.state !== 'running')
        void this.context
          .resume()
          .then(() => this.scheduleMusic())
          .catch(() => {});
      else this.scheduleMusic();
    } catch {
      // Audio is optional on devices without a usable output/context.
    }
  }

  update(settings: GameAudioSettings) {
    this.settings = settings;
    if (!this.context || !this.master) return;
    for (const key of ['master', ...audioChannels] as const) {
      const gain = key === 'master' ? this.master : this.buses[key];
      const item = settings[key];
      gain.gain.setTargetAtTime(item.enabled ? item.volume : 0, this.context.currentTime, 0.025);
    }
    if (!this.musicAudible()) this.stopMusic();
    else this.scheduleMusic();
  }

  visibility(visible: boolean) {
    this.visible = visible;
    if (!visible) {
      this.stopMusic();
      for (const source of this.sources) source.stop();
      if (this.context) void this.context.suspend().catch(() => {});
    } else if (this.context && !this.disposed) this.unlock();
  }

  private musicAudible() {
    const { master, music } = this.settings;
    return this.visible && master.enabled && master.volume > 0 && music.enabled && music.volume > 0;
  }

  private track(source: AudioScheduledSourceNode, nodes: AudioNode[], music = false) {
    this.sources.add(source);
    if (music) this.musicSources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      this.musicSources.delete(source);
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
    };
  }

  private tone(
    channel: AudioChannel,
    frequency: number,
    at: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    endFrequency?: number,
  ) {
    const audio = this.context!;
    const source = audio.createOscillator();
    const envelope = audio.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, at);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(envelope);
    envelope.connect(this.buses[channel]);
    this.track(source, [envelope], channel === 'music');
    source.start(at);
    source.stop(at + duration + 0.02);
  }

  private scheduleMusic() {
    if (this.disposed || !this.context || this.context.state !== 'running' || !this.musicAudible())
      return;
    if (!this.musicBuffer) {
      this.musicLoad ??= this.musicLoader(this.context)
        .then((buffer) => {
          if (this.disposed) return;
          this.musicBuffer = buffer;
          this.scheduleMusic();
        })
        .catch(() => {
          /* Effects remain available if music cannot load. */
        });
      return;
    }
    if (this.musicSources.size) return;
    const source = this.context.createBufferSource();
    source.buffer = this.musicBuffer;
    source.loop = true;
    source.connect(this.buses.music);
    this.track(source, [], true);
    this.musicStartedAt = this.context.currentTime;
    source.start(0, this.musicOffset % this.musicBuffer.duration);
  }

  private stopMusic() {
    if (this.musicSources.size && this.context && this.musicBuffer)
      this.musicOffset =
        (this.musicOffset + this.context.currentTime - this.musicStartedAt) %
        this.musicBuffer.duration;
    for (const source of this.musicSources) source.stop();
    this.musicSources.clear();
  }

  play(kind: GameSound) {
    if (this.disposed || !this.visible) return;
    this.unlock();
    const audio = this.context;
    const channel =
      kind === 'swing' || kind === 'slice' ? kind : kind === 'select' ? 'selection' : 'feedback';
    if (
      !audio ||
      audio.state !== 'running' ||
      !this.settings.master.enabled ||
      !this.settings[channel].enabled
    )
      return;
    const now = audio.currentTime;
    if (kind === 'swing' || kind === 'slice') {
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const highCut = audio.createBiquadFilter();
      const envelope = audio.createGain();
      const swing = kind === 'swing';
      const duration = swing ? 0.21 : 0.14;
      source.buffer = this.noise!;
      filter.type = 'bandpass';
      filter.Q.value = swing ? 1.6 : 0.85;
      // A rounded attack and rising/falling air sweep read as "vút", not static hiss.
      filter.frequency.setValueAtTime(swing ? 450 : 1700, now);
      if (swing)
        filter.frequency.exponentialRampToValueAtTime(3200 + Math.random() * 400, now + 0.055);
      filter.frequency.exponentialRampToValueAtTime(swing ? 550 : 650, now + duration);
      highCut.type = 'lowpass';
      highCut.frequency.value = swing ? 5200 : 4200;
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(swing ? 0.65 : 0.32, now + (swing ? 0.045 : 0.006));
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(highCut);
      highCut.connect(envelope);
      envelope.connect(this.buses[channel]);
      this.track(source, [filter, highCut, envelope]);
      source.start(now);
      source.stop(now + duration);
      if (swing) this.tone('swing', 850, now + 0.025, 0.13, 0.055, 'sine', 150);
      else this.tone('slice', 160, now, 0.1, 0.14, 'sine', 60);
    } else if (kind === 'select') {
      this.tone('selection', 740, now, 0.07, 0.08, 'sine', 560);
    } else {
      const notes = kind === 'correct' ? [523, 659, 784] : kind === 'wrong' ? [330, 196] : [440];
      notes.forEach((hz, i) =>
        this.tone(
          'feedback',
          hz,
          now + i * (kind === 'wrong' ? 0.16 : 0.09),
          0.3,
          kind === 'wrong' ? 0.14 : 0.09,
          kind === 'wrong' ? 'triangle' : 'sine',
          kind === 'wrong' ? hz * 0.75 : undefined,
        ),
      );
    }
  }

  destroy() {
    this.disposed = true;
    for (const source of this.sources) source.stop();
    this.sources.clear();
    this.musicSources.clear();
    if (this.context) void this.context.close().catch(() => {});
  }
}
