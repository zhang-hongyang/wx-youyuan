const express = require('express');
const { authGuard } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../middleware/response');
const reimbursementService = require('../services/reimbursementService');

const router = express.Router();

router.get('/history', authGuard, async (req, res) => {
  try {
    const list = await reimbursementService.listByUser(req.user.userId);
    return sendSuccess(res, list);
  } catch (e) {
    return sendError(res, 50001, e.message, 500);
  }
});

router.post('/submit', authGuard, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id || !payload.type || !payload.amount) {
      return sendError(res, 40001, '报销参数不完整', 400);
    }
    const data = await reimbursementService.submit(payload, req.user.userId);
    return sendSuccess(res, data);
  } catch (e) {
    return sendError(res, 50001, e.message, 500);
  }
});

module.exports = router;
