function sendSuccess(res, data = null, message = 'ok') {
  res.json({
    code: 0,
    message,
    data
  });
}

function sendError(res, code = 50001, message = '服务异常', status = 500) {
  res.status(status).json({
    code,
    message,
    data: null
  });
}

module.exports = {
  sendSuccess,
  sendError
};
