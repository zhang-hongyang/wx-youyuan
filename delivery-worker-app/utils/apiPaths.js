const API_PATHS = {
  auth: {
    loginWechat: '/auth/login/wechat',
    bindWechat: '/auth/bind/wechat'
  },
  task: {
    today: '/tasks/today',
    orderDetail: (orderId) => `/orders/${orderId}`
  },
  checkin: {
    submit: '/checkin/submit'
  }
};

module.exports = {
  API_PATHS
};
