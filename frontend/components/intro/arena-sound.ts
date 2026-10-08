// The intro's arena, synthesized: a crowd roar of filtered noise that swells
// into the slam, and a bass hit under every beat. Nothing is fetched.

export type Hit = "count" | "go" | "land" | "slam" | "card";

/** Intro-clock seconds each beat lands on, shared with the visuals. */
export const HITS: [number, Hit][] = [
  [0.8, "count"],
  [1.15, "count"],
  [1.5, "count"],
  [1.85, "go"],
  [2.5, "land"],
  [2.8, "land"],
  [3.2, "slam"],
  [3.9, "card"],
  [4.25, "card"],
];

// The roar's level over the intro clock: a murmur, a swell through the
// countdown, the eruption on the slam, then a long tail.
const ROAR: [number, number][] = [
  [0, 0.04],
  [0.8, 0.1],
  [1.85, 0.2],
  [3.2, 0.42],
  [4.2, 0.24],
  [5.6, 0],
];

function noise(ctx: AudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function hit(ctx: AudioContext, out: AudioNode, at: number, kind: Hit) {
  const big = kind === "slam" || kind === "go";
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(big ? 110 : kind === "card" ? 220 : 90, at);
  osc.frequency.exponentialRampToValueAtTime(big ? 32 : 45, at + (big ? 0.5 : 0.22));
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(big ? 0.9 : kind === "card" ? 0.18 : 0.55, at + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, at + (big ? 0.9 : 0.35));
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + 1);
}

/**
 * Plays the arena from `from` seconds into the intro, on the intro's own
 * clock, so it lines up with whatever the screen is already showing. Must be
 * called from a user gesture. Returns a stop that fades it out.
 */
export function playArena(from: number): () => void {
  const ctx = new AudioContext();
  const now = ctx.currentTime + 0.02;
  const at = (t: number) => now + Math.max(0, t - from);

  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  // Two bands of noise read as a crowd: a low rumble and the cheering above it.
  const crowd = ctx.createGain();
  crowd.gain.setValueAtTime(0.0001, now);
  for (const [t, level] of ROAR) if (t >= from) crowd.gain.linearRampToValueAtTime(Math.max(level, 0.0001), at(t));
  crowd.connect(master);
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, 6);
  for (const [freq, q] of [
    [420, 0.7],
    [1500, 1.1],
  ]) {
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq;
    band.Q.value = q;
    src.connect(band).connect(crowd);
  }
  src.start(now);

  for (const [t, kind] of HITS) if (t >= from) hit(ctx, master, at(t), kind);

  return () => {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    setTimeout(() => void ctx.close(), 400);
  };
}
