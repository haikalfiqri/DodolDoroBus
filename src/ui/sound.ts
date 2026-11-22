/** Tiny chiptune-style sound effects (WebAudio, no files). Off by default until the player turns it on. */
let ctx: AudioContext | null = null
let on = (() => { try { return localStorage.getItem('ct-sound') === '1' } catch { return false } })()
function tone(freq: number, dur = 0.1, type: OscillatorType = 'square', delay = 0, vol = 0.05): void {
  if (!on) return
  ctx ??= new AudioContext()
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur)
}
export const sfx = {
  get on() { return on },
  toggle() { on = !on; try { localStorage.setItem('ct-sound', on ? '1' : '0') } catch { /* ignore */ } if (on) tone(660, 0.08) },
  tick: () => tone(880, 0.04),
  go: () => { tone(523, 0.08); tone(784, 0.1, 'square', 0.08) },
  good: () => { tone(659, 0.08); tone(988, 0.14, 'square', 0.08) },
  bad: () => { tone(220, 0.18, 'sawtooth') },
  hit: () => { tone(120, 0.12, 'triangle', 0, 0.12) },
  warn: () => { tone(440, 0.07, 'sawtooth'); tone(330, 0.1, 'sawtooth', 0.09) },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', i * 0.12)) },
}
