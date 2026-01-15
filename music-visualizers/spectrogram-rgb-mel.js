VisualizerRegistry['spectrogram-rgb-mel'] = {
  id: 'spectrogram-rgb-mel',
  name: 'Spectrogram (RGB Mel FFT)',

  _fftSize: 0,
  _re: null,
  _im: null,
  _window: null,
  _bitrev: null,
  _cos: null,
  _sin: null,

  _melBins: null,
  _sampleRate: 44100,
  _rowBins: null,
  _rowBinsH: 0,

  _hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); },
  _melToHz(mel) { return 700 * (Math.pow(10, mel / 2595) - 1); },

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

    // Mel lookup bins (1024 steps)
    const bins = N >> 1;
    const nyquist = sampleRate / 2;

    const melMin = this._hzToMel(20);
    const melMax = this._hzToMel(nyquist);

    this._melBins = new Uint16Array(1024);
    for (let i = 0; i < this._melBins.length; i++) {
      const t = i / (this._melBins.length - 1);
      const mel = melMin + t * (melMax - melMin);
      const hz = this._melToHz(mel);
      const bin = Math.floor((hz / nyquist) * bins);
      this._melBins[i] = Math.min(bins - 1, Math.max(1, bin));
    }

    // force row remap rebuild
    this._rowBins = null;
    this._rowBinsH = 0;
  },

  _ensureRowBins(H) {
    if (this._rowBins && this._rowBinsH === H) return;
    this._rowBinsH = H;
    this._rowBins = new Uint16Array(H);

    const melMap = this._melBins;
    const melLen = melMap.length;

    for (let y = 0; y < H; y++) {
      const idx = Math.floor((y / H) * (melLen - 1));
      // invert so low frequencies are at bottom
      this._rowBins[y] = melMap[melLen - 1 - idx];
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

  _bandColumn(buf, outNormByRow) {
    const N = this._fftSize;

    // windowed input
    for (let i = 0; i < N; i++) {
      const s = buf[i] || 0;
      this._re[i] = s * this._window[i];
      this._im[i] = 0;
    }

    this._fft();

    // For each row, compute dB -> normalized intensity
    // Tuned for real music content
    for (let y = 0; y < outNormByRow.length; y++) {
      const bin = this._rowBins[y];
      const re = this._re[bin];
      const im = this._im[bin];
      const mag = Math.sqrt(re * re + im * im);

      const db = 20 * Math.log10(mag + 1e-9);
      const norm = Math.max(0, Math.min(1, (db + 100) / 80));
      outNormByRow[y] = norm;
    }
  },

  draw(frame) {
    const { ctx, bCtx, bufferCanvas, W, H, buffers, config } = frame;

    const FFT_SIZE = config.FFT_SIZE;
    const SCROLL = Math.max(1, config.SCROLL | 0);
    const FADE = config.FADE;

    if (this._fftSize !== FFT_SIZE) {
      this._initFFT(FFT_SIZE, 44100);
    }
    this._ensureRowBins(H);

    // Fade + scroll history
    bCtx.fillStyle = `rgba(0,0,0,${FADE})`;
    bCtx.fillRect(0, 0, W, H);
    bCtx.drawImage(bufferCanvas, -SCROLL, 0);

    // Compute per-band intensity columns
    const rCol = new Float32Array(H); // low -> red
    const gCol = new Float32Array(H); // mid -> green
    const bCol = new Float32Array(H); // high -> blue

    this._bandColumn(buffers.low || buffers.main, rCol);
    this._bandColumn(buffers.mid || buffers.main, gCol);
    this._bandColumn(buffers.high || buffers.main, bCol);

    // Draw RGB composite column on the right edge
    const x = W - SCROLL;

    for (let y = 0; y < H; y++) {
      const r = (rCol[y] * 255) | 0;
      const g = (gCol[y] * 255) | 0;
      const b = (bCol[y] * 255) | 0;

      // Skip near-black pixels
      if ((r + g + b) < 8) continue;

      bCtx.fillStyle = `rgb(${r},${g},${b})`;
      bCtx.fillRect(x, y, SCROLL, 1);
    }

    ctx.drawImage(bufferCanvas, 0, 0);
  }
};
