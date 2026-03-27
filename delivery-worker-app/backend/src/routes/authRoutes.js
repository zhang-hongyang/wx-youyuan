const express = require('express');
const { sendSuccess, sendError } = require('../middleware/response');
const authService = require('../services/authService');

const router = express.Router();

router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return sendError(res, 40001, '手机号不能为空', 400);
    }
    const code = '123456';
    await authService.createOrUpdateCode(phone, code);
    return sendSuccess(res, { expireSeconds: 600 }, '验证码已发送（开发环境固定123456）');
  } catch (e) {
    return sendError(res, e.bizCode || 50001, e.message, 500);
  }
});

router.post('/register/phone', async (req, res) => {
  try {
    const { phone, verifyCode, name } = req.body;
    if (!phone || !verifyCode || !name) {
      return sendError(res, 40001, '姓名/手机号/验证码不能为空', 400);
    }
    const data = await authService.registerByPhone({ phone, code: verifyCode, name });
    return sendSuccess(res, data);
  } catch (e) {
    const status = e.bizCode ? 400 : 500;
    return sendError(res, e.bizCode || 50001, e.message, status);
  }
});

router.post('/login/phone', async (req, res) => {
  try {
    const { phone, verifyCode } = req.body;
    if (!phone || !verifyCode) {
      return sendError(res, 40001, '手机号或验证码不能为空', 400);
    }
    const data = await authService.loginByPhone({ phone, code: verifyCode });
    return sendSuccess(res, data);
  } catch (e) {
    const status = e.bizCode ? 400 : 500;
    return sendError(res, e.bizCode || 50001, e.message, status);
  }
});

router.post('/login/employee', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
      return sendError(res, 40001, '工号或密码不能为空', 400);
    }
    const data = await authService.loginByEmployee({ employeeId, password });
    return sendSuccess(res, data);
  } catch (e) {
    const status = e.bizCode ? 400 : 500;
    return sendError(res, e.bizCode || 50001, e.message, status);
  }
});

module.exports = router;
