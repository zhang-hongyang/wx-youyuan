const { CLOUD_FUNCTIONS, STORAGE_KEYS } = require('./constants.js');

function buildUrl(url) {
  return url;
}

function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    timeout = 15000,
    showErrorToast = true,
    idempotencyKey = ''
  } = options;

  const token = wx.getStorageSync(STORAGE_KEYS.TOKEN) || '';

  return new Promise((resolve, reject) => {
    if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
      const err = {
        type: 'cloud-unavailable',
        message: '当前基础库或运行环境不支持云开发'
      };
      if (showErrorToast) {
        wx.showToast({ title: err.message, icon: 'none' });
      }
      reject(err);
      return;
    }

    wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.API,
      data: {
        path: buildUrl(url),
        method,
        data,
        timeout,
        header: {
          Authorization: token ? `Bearer ${token}` : '',
          'X-Idempotency-Key': idempotencyKey || '',
          ...header
        }
      },
      success: (res) => {
        const payload = res.result || {};

        if (typeof payload.code !== 'undefined' && payload.code !== 0) {
          const errMsg = payload.message || '云函数处理失败';
          if (showErrorToast) {
            wx.showToast({ title: errMsg, icon: 'none' });
          }
          reject({
            type: 'business',
            ...payload
          });
          return;
        }

        resolve(payload.data !== undefined ? payload.data : payload);
      },
      fail: (err) => {
        if (showErrorToast) {
          wx.showToast({ title: '云开发调用失败，请稍后重试', icon: 'none' });
        }
        reject({
          type: 'network',
          ...err
        });
      }
    });
  });
}

function get(url, data = {}, options = {}) {
  return request({ ...options, url, method: 'GET', data });
}

function post(url, data = {}, options = {}) {
  return request({ ...options, url, method: 'POST', data });
}

function put(url, data = {}, options = {}) {
  return request({ ...options, url, method: 'PUT', data });
}

function del(url, data = {}, options = {}) {
  return request({ ...options, url, method: 'DELETE', data });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  buildUrl
};
