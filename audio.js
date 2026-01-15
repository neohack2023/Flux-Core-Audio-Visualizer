window.AudioEngine = (() => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const analyserMain = ctx.createAnalyser();
  const analyserLow = ctx.createAnalyser();
  const analyserMid = ctx.createAnalyser();
  const analyserHigh = ctx.createAnalyser();

  const analysers = [analyserMain, analyserLow, analyserMid, analyserHigh];
  analysers.forEach(a => (a.smoothingTimeConstant = 0.8));

  let source = null;
  let buffer = null;

  async function load(file) {
    const data = await file.arrayBuffer();
    buffer = await ctx.decodeAudioData(data);
  }

  function play() {
    if (!buffer) return;
    stop();

    analysers.forEach(a => (a.fftSize = CONFIG.FFT_SIZE));

    source = ctx.createBufferSource();
    source.buffer = buffer;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 220;

    const mid = ctx.createBiquadFilter();
    mid.type = 'bandpass';
    mid.frequency.value = 1200;
    mid.Q.value = 1;

    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 3000;

    source.connect(analyserMain);
    source.connect(low).connect(analyserLow);
    source.connect(mid).connect(analyserMid);
    source.connect(high).connect(analyserHigh);

    analyserMain.connect(ctx.destination);
    source.start();
  }

  function stop() {
    if (source) {
      try { source.stop(); } catch {}
      source.disconnect();
      source = null;
    }
  }

  function getBuffers() {
    const pull = a => {
      const buf = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(buf);
      return buf;
    };

    return {
      main: pull(analyserMain),
      low: pull(analyserLow),
      mid: pull(analyserMid),
      high: pull(analyserHigh)
    };
  }

  function rmsOf(buf) {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  function getRMS() {
    const b = getBuffers();
    return {
      main: rmsOf(b.main),
      low: rmsOf(b.low),
      mid: rmsOf(b.mid),
      high: rmsOf(b.high)
    };
  }

  return {
    load,
    play,
    stop,
    getBuffers,
    getRMS,
    getSampleRate: () => ctx.sampleRate
  };
})();
