import type { Tune } from "./songs";

/**
 * Play the opening of a song's melody with a soft synthesized tone, a bit like
 * a music box: just enough to remind people how it goes. Returns a function
 * that stops it early; onEnd runs when it stops either way.
 */
export function playTune(tune: Tune, onEnd: () => void): () => void {
  const ctx = new AudioContext();
  const out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(ctx.destination);

  const secondsPerBeat = 60 / tune.tempo;
  let t = ctx.currentTime + 0.05;
  for (const note of tune.notes) {
    const length = note.beats * secondsPerBeat;
    if (note.pitch !== null) tone(ctx, out, note.pitch, t, length);
    t += length;
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    void ctx.close();
    onEnd();
  };
  const timer = setTimeout(finish, (t - ctx.currentTime + 0.3) * 1000);
  return finish;
}

function tone(ctx: AudioContext, out: AudioNode, pitch: number, start: number, length: number) {
  const freq = 440 * 2 ** ((pitch - 69) / 12);
  const end = start + length;
  const gain = ctx.createGain();
  // Quick strike, then fade like a plucked or struck note; a short gap at the
  // end keeps repeated notes distinct.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.12, Math.max(start + 0.05, end - 0.06));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(out);

  // A triangle wave for the body and a faint sine an octave up for a little shimmer.
  for (const [type, multiple, level] of [
    ["triangle", 1, 1],
    ["sine", 2, 0.15],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * multiple;
    const mix = ctx.createGain();
    mix.gain.value = level;
    osc.connect(mix).connect(gain);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}
