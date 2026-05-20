let _audioCtx = null;
let _keepAlive = null;

export function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

// Keeps AudioContext alive with a silent oscillator so the browser never
// auto-suspends it between order sounds on background pages.
function startAudioKeepAlive() {
  if (_keepAlive) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0; // completely silent
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    _keepAlive = osc;
  } catch {}
}

export async function unlockAudioCtx() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    startAudioKeepAlive(); // prevent future auto-suspension
  } catch {}
  if ("speechSynthesis" in window) {
    try {
      const silent = new SpeechSynthesisUtterance(" ");
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    } catch {}
  }
}

export function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function playNewOrderSound() {
  try {
    const ctx = getAudioCtx();
    // Auto-resume if browser suspended the context (happens after inactivity on background tabs)
    if (ctx.state === "suspended") {
      ctx.resume().then(() => _doPlay(ctx)).catch(() => {});
      return;
    }
    _doPlay(ctx);
  } catch {}
}

function _doPlay(ctx) {
  try {
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    const note = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(master);
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.85, ctx.currentTime + start + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    note(784, 0.0, 0.18);
    note(988, 0.18, 0.18);
    note(1175, 0.36, 0.18);
    note(1568, 0.54, 0.4);
    note(1175, 0.96, 0.15);
    note(1568, 1.14, 0.5);
  } catch {}
}
