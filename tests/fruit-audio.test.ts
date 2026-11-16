import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameAudio, readAudioSettings } from '../src/audio/GameAudio';

test('audio preferences default on, recover corrupt data and clamp stored volumes', () => {
  const defaults = readAudioSettings(null);
  assert.ok(Object.values(defaults).every((item) => item.enabled));
  assert.deepEqual(readAudioSettings('{broken'), defaults);
  const saved = readAudioSettings(
    JSON.stringify({
      master: { enabled: false, volume: 5 },
      music: { volume: -1 },
      swing: { volume: 'bad' },
    }),
  );
  assert.deepEqual(saved.master, { enabled: false, volume: 1 });
  assert.equal(saved.music.volume, 0);
  assert.equal(saved.swing.volume, defaults.swing.volume);
  assert.equal(saved.slice.enabled, true);
});

test('mixer unlocks on interaction, isolates channels, stops hidden audio and releases resources', async () => {
  class Parameter {
    value = 0;
    setValueAtTime(value: number) {
      this.value = value;
    }
    linearRampToValueAtTime(value: number) {
      this.value = value;
    }
    exponentialRampToValueAtTime(value: number) {
      this.value = value;
    }
    setTargetAtTime(value: number) {
      this.value = value;
    }
  }
  class Node {
    gain = new Parameter();
    frequency = new Parameter();
    Q = new Parameter();
    onended?: () => void;
    type = '';
    buffer: unknown;
    starts = 0;
    offset = 0;
    stopped = false;
    connect() {}
    disconnect() {}
    start(_when = 0, offset = 0) {
      this.starts++;
      this.offset = offset;
    }
    stop() {
      this.stopped = true;
    }
  }
  class Context {
    static instances: Context[] = [];
    state = 'suspended';
    currentTime = 0;
    sampleRate = 1000;
    destination = new Node();
    sources: Node[] = [];
    gains: Node[] = [];
    constructor() {
      Context.instances.push(this);
    }
    createGain() {
      const node = new Node();
      this.gains.push(node);
      return node;
    }
    createOscillator() {
      const node = new Node();
      this.sources.push(node);
      return node;
    }
    createBufferSource() {
      return this.createOscillator();
    }
    createBiquadFilter() {
      return new Node();
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(500) };
    }
    async resume() {
      this.state = 'running';
    }
    async suspend() {
      this.state = 'suspended';
    }
    async close() {
      this.state = 'closed';
    }
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
  const settings = readAudioSettings(null);
  let loads = 0;
  const mixer = new GameAudio(settings, async () => {
    loads++;
    return { duration: 64 } as AudioBuffer;
  });
  try {
    assert.equal(Context.instances.length, 0, 'no autoplay context before interaction');
    mixer.unlock();
    await Promise.resolve();
    await Promise.resolve();
    const audio = Context.instances[0];
    assert.equal(audio.state, 'running');
    assert.ok(audio.sources.length > 0, 'music starts after unlock');
    mixer.unlock();
    assert.equal(audio.sources.length, 1, 'repeated interactions do not stack music loops');
    audio.currentTime = 7;
    mixer.visibility(false);
    mixer.visibility(true);
    await Promise.resolve();
    assert.equal(audio.sources.at(-1)?.offset, 7, 'music resumes at the same position');
    assert.equal(loads, 1, 'music is only fetched and decoded once');
    const effectsOnly = { ...settings, music: { enabled: false, volume: 0.35 } };
    mixer.update(effectsOnly);
    assert.ok(
      audio.sources.every((node) => node.stopped),
      'muting music cancels scheduled notes',
    );
    let count = audio.sources.length;
    mixer.play('slice');
    assert.equal(audio.sources.length, count + 2, 'slice includes noise and impact');
    mixer.update({ ...effectsOnly, swing: { enabled: false, volume: 0.7 } });
    count = audio.sources.length;
    mixer.play('swing');
    assert.equal(audio.sources.length, count, 'disabled swing remains silent');
    mixer.update({ ...effectsOnly, selection: { enabled: false, volume: 0.55 } });
    mixer.play('select');
    assert.equal(audio.sources.length, count, 'disabled tile selection remains silent');
    mixer.play('wrong');
    assert.equal(audio.sources.length, count + 2, 'feedback remains independent');
    mixer.visibility(false);
    assert.equal(audio.state, 'suspended');
    assert.ok(audio.sources.every((node) => node.stopped));
    count = audio.sources.length;
    mixer.play('correct');
    assert.equal(audio.sources.length, count, 'hidden tabs cannot play effects');
    mixer.destroy();
    assert.equal(audio.state, 'closed');
    mixer.unlock();
    assert.equal(Context.instances.length, 1, 'destroyed mixer cannot recreate resources');
  } finally {
    mixer.destroy();
    if (descriptor) Object.defineProperty(globalThis, 'AudioContext', descriptor);
    else Reflect.deleteProperty(globalThis, 'AudioContext');
  }
});
