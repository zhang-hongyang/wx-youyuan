const jwt = require('jsonwebtoken');
const { sendError } = require('./response');

function authGuard(req, res, next) {
  const tokenHeader = req.headers.authorization || '';
  const token = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7) : '';

  if (!token) {
    return sendError(res, 40101, '未登录或Token缺失', 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'replace_me');
    req.user = payload;
    return next();
  } catch (e) {
    return sendError(res, 40101, 'Token无效或已过期', 401);
  }
}

module.exports = {
  authGuard
};
