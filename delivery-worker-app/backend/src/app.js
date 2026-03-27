const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sendSuccess, sendError } = require('./middleware/response');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const fileRoutes = require('./routes/fileRoutes');
const reimbursementRoutes = require('./routes/reimbursementRoutes');
const problemRoutes = require('./routes/problemRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/static', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  sendSuccess(res, {
    service: 'delivery-worker-backend',
    time: new Date().toISOString()
  });
});

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/checkin', checkinRoutes);
app.use('/files', fileRoutes);
app.use('/reimbursements', reimbursementRoutes);
app.use('/problems', problemRoutes);

app.use((req, res) => {
  sendError(res, 40401, '接口不存在', 404);
});

app.use((err, req, res, next) => {
  console.error(err);
  sendError(res, 50001, err.message || '服务异常', 500);
});

const port = Number(process.env.PORT || 3300);
app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
