const { post } = require('../utils/request.js');
const { API_PATHS } = require('../utils/apiPaths.js');

function getWechatLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res && res.code) {
          resolve(res.code);
          return;
        }
        reject(new Error('微信登录凭证获取失败'));
      },
      fail: reject
    });
  });
}

async function loginByWechat() {
  const code = await getWechatLoginCode();
  return await post(API_PATHS.auth.loginWechat, { code }, { showErrorToast: false });
}

async function bindWechatAccount({ employeeId, bindCode, name = '' }) {
  const code = await getWechatLoginCode();
  return await post(API_PATHS.auth.bindWechat, {
    employeeId,
    bindCode,
    name,
    code
  }, { showErrorToast: false });
}

module.exports = {
  loginByWechat,
  bindWechatAccount
};
