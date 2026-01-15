// ===============================
// ENGINE CORE (v1-ENHANCED)
// ===============================

const canvas = document.getElementById('canvas');
const bufferCanvas = document.getElementById('bufferCanvas');

const ctx = canvas.getContext('2d');
const bCtx = bufferCanvas.getContext('2d');

// ===============================
// CANVAS RESIZE (DPR SAFE)
// ===============================
function resizeCanvases() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  bufferCanvas.width = canvas.width;
  bufferCanvas.height = canvas.height;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// ===============================
// ENGINE STATE
// ===============================
let running = false;
let startTime = 0;

let prevRms = 0;
let glitchTimer = 0;

// ===============================
// UTIL
// ===============================
function padBuffer(buf, size) {
  if (!buf || buf.length >= size) return buf;
  const out = new Float32Array(size);
  out.set(buf);
  return out;
}

// ===============================
// GLITCH DETECTION (FROM v1)
// ===============================
function updateGlitchState(rms) {
  const flux = Math.abs(rms.main - prevRms);

  if (flux > CONFIG.GLITCH_FLUX_THRESHOLD) {
    glitchTimer = CONFIG.GLITCH_HOLD_TIME;
  }

  if (glitchTimer > 0) {
    glitchTimer -= 1 / 60;
  }

  prevRms = rms.main;

  return glitchTimer > 0;
}

// ===============================
// MAIN LOOP
// ===============================
function loop(now) {
  if (!running) return;

  const time = (now - startTime) / 1000;

  const buffers = AudioEngine.getBuffers();
  const rms = AudioEngine.getRMS();

  buffers.main = padBuffer(buffers.main, CONFIG.FFT_SIZE);
  buffers.low = padBuffer(buffers.low, CONFIG.FFT_SIZE);
  buffers.mid = padBuffer(buffers.mid, CONFIG.FFT_SIZE);
  buffers.high = padBuffer(buffers.high, CONFIG.FFT_SIZE);

  const silent = rms.main < 1e-6;
  const isGlitching = updateGlitchState(rms);

  const frame = Object.freeze({
    time,
    silent,
    isGlitching,

    rms,
    prevRms,
    buffers,

    ctx,
    bCtx,
    bufferCanvas,

    W: canvas.clientWidth,
    H: canvas.clientHeight,

    config: CONFIG
  });

  ctx.clearRect(0, 0, frame.W, frame.H);

  if (window.ActiveVisualizer?.draw) {
    try {
      window.ActiveVisualizer.draw(frame);
    } catch (err) {
      console.error('Visualizer error:', err);
    }
  }

  requestAnimationFrame(loop);
}

// ===============================
// ENGINE API
// ===============================
window.Engine = {
  start() {
    if (running) return;
    running = true;
    startTime = performance.now();
    requestAnimationFrame(loop);
  },
  stop() {
    running = false;
  }
};

// ===============================
// AUTO START ON PLAY
// ===============================
const _play = AudioEngine.play;
AudioEngine.play = function () {
  _play.call(AudioEngine);
  Engine.start();
};
