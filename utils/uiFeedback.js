function showSuccess(title = '操作成功') {
  wx.showToast({ title, icon: 'success' });
}

function showError(title = '操作失败，请重试') {
  wx.showToast({ title, icon: 'none' });
}

function handleError(error, fallbackMessage = '操作失败，请稍后重试') {
  const message = (error && (error.message || error.errMsg)) || fallbackMessage;
  showError(message);
}

async function withLoading(task, options = {}) {
  const {
    title = '加载中...',
    mask = true
  } = options;

  wx.showLoading({ title, mask });
  try {
    return await task();
  } finally {
    wx.hideLoading();
  }
}

module.exports = {
  showSuccess,
  showError,
  handleError,
  withLoading
};
