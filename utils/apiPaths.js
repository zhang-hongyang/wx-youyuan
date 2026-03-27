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
  },
  reimbursement: {
    history: '/reimbursements/history',
    submit: '/reimbursements/submit',
    adminList: '/admin/reimbursements',
    review: '/admin/reimbursements/review'
  }
};

module.exports = {
  API_PATHS
};
