// Synthesizes a short two-tone "ping" with the Web Audio API instead of
// shipping an audio asset — keeps this dependency-free and instant to load.
let sharedCtx: AudioContext | null = null;

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    sharedCtx ??= new AudioCtx();
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume();
    }

    const ctx = sharedCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(660, now + 0.09);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  } catch {
    // Som é só um extra — nunca deve derrubar o app se o navegador bloquear.
  }
}
