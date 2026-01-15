VisualizerRegistry['spectrogram-scroll'] = {
  id: 'spectrogram-scroll',
  name: 'Spectrogram (Mel FFT)',

  _fftSize: 0,
  _re: null,
  _im: null,
  _window: null,
  _bitrev: null,
  _cos: null,
  _sin: null,

  _melBins: null,
  _sampleRate: 44100,

  // ---------- MEL HELPERS ----------
  _hzToMel(hz) {
    return 2595 * Math.log10(1 + hz / 700);
  },

  _melToHz(mel) {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  },

  _initFFT(N, sampleRate = 44100) {
    this._fftSize = N;
    this._sampleRate = sampleRate;

    this._re = new Float32Array(N);
    this._im = new Float32Array(N);
    this._window = new Float32Array(N);
    this._bitrev = new Uint16Array(N);
    this._cos = new Float32Array(N / 2);
    this._sin = new Float32Array(N / 2);

    // Hann window
    for (let i = 0; i < N; i++) {
      this._window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    }

    // Bit reversal
    const bits = Math.log2(N);
    for (let i = 0; i < N; i++) {
      let x = i, y = 0;
      for (let b = 0; b < bits; b++) {
        y = (y << 1) | (x & 1);
        x >>= 1;
      }
      this._bitrev[i] = y;
    }

    // Trig tables
    for (let k = 0; k < N / 2; k++) {
      const a = -2 * Math.PI * k / N;
      this._cos[k] = Math.cos(a);
      this._sin[k] = Math.sin(a);
    }

    // Precompute Mel bins → FFT bins
    const bins = N >> 1;
    const nyquist = sampleRate / 2;

    const melMin = this._hzToMel(20);
    const melMax = this._hzToMel(nyquist);

    this._melBins = new Uint16Array(1024);

    for (let y = 0; y < this._melBins.length; y++) {
      const t = y / (this._melBins.length - 1);
      const mel = melMin + t * (melMax - melMin);
      const hz = this._melToHz(mel);
      const bin = Math.floor((hz / nyquist) * bins);
      this._melBins[y] = Math.min(bins - 1, Math.max(1, bin));
    }
  },

  _fft() {
    const N = this._fftSize;
    const re = this._re;
    const im = this._im;
    const rev = this._bitrev;

    for (let i = 0; i < N; i++) {
      const j = rev[i];
      if (j > i) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }

    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1;
      const step = N / size;

      for (let i = 0; i < N; i += size) {
        let k = 0;
        for (let j = i; j < i + half; j++) {
          const l = j + half;
          const wr = this._cos[k];
          const wi = this._sin[k];

          const tr = wr * re[l] - wi * im[l];
          const ti = wr * im[l] + wi * re[l];

          re[l] = re[j] - tr;
          im[l] = im[j] - ti;
          re[j] += tr;
          im[j] += ti;

          k += step;
        }
      }
    }
  },

  draw(frame) {
    const { ctx, bCtx, bufferCanvas, W, H, buffers, config } = frame;
    const src = buffers[config.BAND] || buffers.main;

    const FFT_SIZE = config.FFT_SIZE;
    const SCROLL = Math.max(1, config.SCROLL | 0);
    const FADE = config.FADE;

    if (this._fftSize !== FFT_SIZE) {
      this._initFFT(FFT_SIZE, 44100);
    }

    // Window input
    for (let i = 0; i < FFT_SIZE; i++) {
      const s = src[i] || 0;
      this._re[i] = s * this._window[i];
      this._im[i] = 0;
    }

    this._fft();

    // Fade + scroll
    bCtx.fillStyle = `rgba(0,0,0,${FADE})`;
    bCtx.fillRect(0, 0, W, H);
    bCtx.drawImage(bufferCanvas, -SCROLL, 0);

    const x = W - SCROLL;
    const melMap = this._melBins;
    const melLen = melMap.length;

    for (let y = 0; y < H; y++) {
      const idx = Math.floor((y / H) * (melLen - 1));
      const bin = melMap[melLen - 1 - idx];

      const re = this._re[bin];
      const im = this._im[bin];
      const mag = Math.sqrt(re * re + im * im);

      // Tuned dB curve for real music
      const db = 20 * Math.log10(mag + 1e-9);
      const norm = Math.max(0, Math.min(1, (db + 100) / 80));

      if (norm < 0.01) continue;

      const g = (norm * 255) | 0;
      bCtx.fillStyle = `rgb(0,${g},0)`;
      bCtx.fillRect(x, y, SCROLL, 1);
    }

    ctx.drawImage(bufferCanvas, 0, 0);
  }
};
