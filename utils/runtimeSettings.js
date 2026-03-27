const { STORAGE_KEYS, RUNTIME_DEFAULTS } = require('./constants.js');

function normalizeSettings(value) {
  if (!value || typeof value !== 'object') {
    return { ...RUNTIME_DEFAULTS };
  }

  const normalized = {
    ...RUNTIME_DEFAULTS,
    ...value
  };

  if (typeof value.forceApi === 'boolean' && typeof value.allowLocalFallback === 'undefined') {
    normalized.allowLocalFallback = !value.forceApi;
  }

  normalized.backendMode = 'cloud';
  return normalized;
}

function getRuntimeSettings() {
  try {
    const value = wx.getStorageSync(STORAGE_KEYS.RUNTIME_SETTINGS);
    return normalizeSettings(value);
  } catch (e) {
    return { ...RUNTIME_DEFAULTS };
  }
}

function setRuntimeSettings(settings = {}) {
  const merged = normalizeSettings({
    ...getRuntimeSettings(),
    ...settings
  });
  wx.setStorageSync(STORAGE_KEYS.RUNTIME_SETTINGS, merged);
  return merged;
}

function isMockFallbackEnabled() {
  const settings = getRuntimeSettings();
  return !!settings.allowLocalFallback;
}

module.exports = {
  getRuntimeSettings,
  setRuntimeSettings,
  isMockFallbackEnabled
};
