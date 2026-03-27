const { post } = require('../utils/request.js');
const { STORAGE_KEYS } = require('../utils/constants.js');
const { API_PATHS } = require('../utils/apiPaths.js');
const { isMockFallbackEnabled } = require('../utils/runtimeSettings.js');

function saveLocal(record) {
  const records = wx.getStorageSync(STORAGE_KEYS.CHECKIN_RECORDS) || [];
  records.push(record);
  wx.setStorageSync(STORAGE_KEYS.CHECKIN_RECORDS, records);
}

async function submitCheckIn(record) {
  try {
    await post(API_PATHS.checkin.submit, record, { showErrorToast: false });
    saveLocal(record);
    return { success: true, mode: 'api' };
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    saveLocal(record);
    return { success: true, mode: 'local' };
  }
}

module.exports = {
  submitCheckIn
};
