const express = require('express');
const { sendSuccess, sendError } = require('../middleware/response');
const { authGuard } = require('../middleware/auth');
const taskService = require('../services/taskService');

const router = express.Router();

router.get('/today', authGuard, async (req, res) => {
  try {
    const list = await taskService.getTodayTasks(req.user.userId);
    return sendSuccess(res, list);
  } catch (e) {
    return sendError(res, 50001, e.message, 500);
  }
});

module.exports = router;
