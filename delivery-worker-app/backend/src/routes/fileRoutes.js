const express = require('express');
const path = require('path');
const multer = require('multer');
const { authGuard } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../middleware/response');
const { query } = require('../db/mysql');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg');
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({ storage });

router.post('/upload', authGuard, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 40001, '文件不能为空', 400);
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const fileUrl = `${protocol}://${host}/static/${req.file.filename}`;

    await query(
      `INSERT INTO uploaded_files (user_id, biz_type, file_name, file_url)
       VALUES (?, ?, ?, ?)`,
      [
        req.user.userId,
        req.body.bizType || 'common',
        req.file.originalname || req.file.filename,
        fileUrl
      ]
    );

    return sendSuccess(res, {
      fileName: req.file.filename,
      url: fileUrl
    });
  } catch (e) {
    return sendError(res, 50001, e.message, 500);
  }
});

module.exports = router;
