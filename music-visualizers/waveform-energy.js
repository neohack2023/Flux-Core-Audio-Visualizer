VisualizerRegistry['waveform-energy'] = {
  id: 'waveform-energy',
  name: 'Waveform Energy',

  draw(frame) {
    const { ctx, W, H, buffers } = frame;
    const buf = buffers.main;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#0f0';
    ctx.beginPath();

    for (let i = 0; i < buf.length; i++) {
      const x = (i / buf.length) * W;
      const y = (0.5 - buf[i] * 0.5) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }

    ctx.stroke();
  }
};
