const express = require('express');
const { sendSuccess, sendError } = require('../middleware/response');
const { authGuard } = require('../middleware/auth');
const checkinService = require('../services/checkinService');

const router = express.Router();

router.post('/submit', authGuard, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id || !payload.type || !payload.date || !payload.time) {
      return sendError(res, 40001, '打卡参数不完整', 400);
    }

    const data = await checkinService.submitCheckin(payload, req.user.userId);
    return sendSuccess(res, data);
  } catch (e) {
    return sendError(res, 50001, e.message, 500);
  }
});

module.exports = router;
