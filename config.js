// ===============================
// CONFIG CORE
// ===============================

// Immutable default snapshot
const DEFAULT_CONFIG = Object.freeze({

  // ---------- ENGINE / AUDIO ----------
  FFT_SIZE: 1024,
  BAND: 'main',

  // ---------- TIME / MOTION ----------
  SCROLL: 2,
  FADE: 0.05,

  // ---------- DEBUG / SYSTEM ----------
  DEBUG: false
});

// ===============================
// LIVE CONFIG (MUTABLE)
// ===============================
const CONFIG = {
  ...DEFAULT_CONFIG
};

// ===============================
// CONFIG API (OPTIONAL BUT CLEAN)
// ===============================

CONFIG.reset = function () {
  Object.assign(CONFIG, DEFAULT_CONFIG);
};

CONFIG.set = function (key, value) {
  if (!(key in DEFAULT_CONFIG)) {
    console.warn(`CONFIG.set: unknown key "${key}"`);
  }
  CONFIG[key] = value;
};

CONFIG.get = function (key) {
  return CONFIG[key];
};

// ===============================
// FREEZE DEFAULTS (SAFETY)
// ===============================
Object.freeze(DEFAULT_CONFIG);

// ===============================
// EXPORT (GLOBAL)
// ===============================
window.CONFIG = CONFIG;
