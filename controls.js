// ===============================
// TRANSPORT
// ===============================
fileInput.onchange = e => AudioEngine.load(e.target.files[0]);
playBtn.onclick = () => AudioEngine.play();

// ===============================
// CONTROL MOUNT
// ===============================
const controlMount = document.getElementById('plugin-controls');

// ===============================
// VISUALIZER SELECT
// ===============================
Object.values(VisualizerRegistry).forEach(v => {
  const opt = document.createElement('option');
  opt.value = v.id;
  opt.textContent = v.name;
  visualizerSelect.appendChild(opt);
});

// ===============================
// RENDER CONTROLS
// ===============================
function renderControls(plugin) {
  controlMount.innerHTML = '';

  if (!plugin || !plugin.controls || plugin.controls.length === 0) {
    controlMount.innerHTML = `
      <div class="hint">
        This visualizer has no adjustable parameters.
      </div>
    `;
    return;
  }

  plugin.controls.forEach(ctrl => {
    // Initialize default if missing
    if (CONFIG[ctrl.id] === undefined) {
      CONFIG[ctrl.id] = ctrl.default;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'control';

    const label = document.createElement('label');
    label.textContent = ctrl.label;

    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = CONFIG[ctrl.id];

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = ctrl.min;
    slider.max = ctrl.max;
    slider.step = ctrl.step;
    slider.value = CONFIG[ctrl.id];

    slider.oninput = e => {
      const v = +e.target.value;
      CONFIG[ctrl.id] = v;
      value.textContent = ctrl.step < 1 ? v.toFixed(2) : v;
    };

    wrapper.appendChild(label);
    wrapper.appendChild(value);
    wrapper.appendChild(slider);

    controlMount.appendChild(wrapper);
  });
}

// ===============================
// ACTIVE VISUALIZER SWITCH
// ===============================
function setActiveVisualizer(id) {
  const plugin = VisualizerRegistry[id];
  if (!plugin) return;

  window.ActiveVisualizer = plugin;
  renderControls(plugin);
}

// ===============================
// BAND SELECT (GLOBAL)
// ===============================
band.onchange = e => {
  CONFIG.BAND = e.target.value;
};

// ===============================
// INIT
// ===============================
setActiveVisualizer(visualizerSelect.value);

visualizerSelect.onchange = e => {
  setActiveVisualizer(e.target.value);
};
