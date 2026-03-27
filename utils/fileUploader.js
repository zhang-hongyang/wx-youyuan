const { CLOUD_STORAGE_PREFIX } = require('./constants');
const { isMockFallbackEnabled } = require('./runtimeSettings');

function uploadOne(filePath, bizType = 'common') {
  const suffixMatch = filePath.match(/(\.[^.\\/]+)$/);
  const suffix = suffixMatch ? suffixMatch[1] : '.jpg';
  const cloudPath = `${CLOUD_STORAGE_PREFIX}/${bizType}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}${suffix}`;

  return new Promise((resolve, reject) => {
    if (!wx.cloud || typeof wx.cloud.uploadFile !== 'function') {
      reject(new Error('当前环境不支持云存储上传'));
      return;
    }

    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => {
        if (res && res.fileID) {
          resolve(res.fileID);
          return;
        }
        reject(new Error('上传失败，未返回 fileID'));
      },
      fail: reject
    });
  });
}

async function uploadWithRetry(filePath, bizType = 'common', maxRetry = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetry; attempt += 1) {
    try {
      const url = await uploadOne(filePath, bizType);
      return url;
    } catch (e) {
      lastError = e;
    }
  }

  if (!isMockFallbackEnabled()) {
    throw lastError || new Error('上传失败');
  }
  return filePath;
}

async function uploadImages(paths = [], bizType = 'common') {
  const result = [];
  for (const filePath of paths) {
    const url = await uploadWithRetry(filePath, bizType, 2);
    result.push(url);
  }
  return result;
}

module.exports = {
  uploadImages
};
