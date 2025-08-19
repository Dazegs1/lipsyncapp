// LipSync App (MVP) - amplitude-based mouth animation
// Uses Web Audio API to read mic input and animate an SVG ellipse (mouth).

let audioCtx = null;
let analyser = null;
let source = null;
let micStream = null;
let rafId = null;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const mouth = document.getElementById('mouth');
const meter = document.getElementById('meter');

// Visual params
const MOUTH_MIN_RY = 6;   // closed
const MOUTH_MAX_RY = 40;  // wide open
let smoothed = 0;

function setStatus(text, kind = 'idle') {
  statusEl.textContent = text;
  statusEl.className = 'status ' + kind;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function computeAmplitude() {
  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    sum += Math.abs(buf[i] - 128);
  }
  const avgDev = sum / buf.length;
  let amp = clamp(avgDev / 40, 0, 1);
  smoothed = 0.25 * amp + 0.75 * smoothed;
  return smoothed;
}

function frame() {
  const amp = computeAmplitude();
  const ry = MOUTH_MIN_RY + amp * (MOUTH_MAX_RY - MOUTH_MIN_RY);
  mouth.setAttribute('ry', ry.toFixed(2));
  meter.style.height = (amp * 100).toFixed(1) + '%';
  rafId = requestAnimationFrame(frame);
}

async function start() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    await audioCtx.resume();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    setStatus('Listening…', 'live');
    smoothed = 0;
    frame();
  } catch (err) {
    console.error(err);
    setStatus('Mic permission denied', 'err');
  }
}

function stop() {
  if (rafId) cancelAnimationFrame(rafId);
  if (source) source.disconnect();
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.suspend();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus('Idle', 'idle');
  mouth.setAttribute('ry', MOUTH_MIN_RY);
  meter.style.height = '0%';
}

startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);
