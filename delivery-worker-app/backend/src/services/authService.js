const jwt = require('jsonwebtoken');
const { query } = require('../db/mysql');

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      userType: user.user_type,
      role: user.role
    },
    process.env.JWT_SECRET || 'replace_me',
    { expiresIn: '7d' }
  );
}

async function createOrUpdateCode(phone, code) {
  await query(
    `INSERT INTO sms_codes (phone, code, expire_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
     ON DUPLICATE KEY UPDATE code = VALUES(code), expire_at = VALUES(expire_at), updated_at = NOW()`,
    [phone, code]
  );
}

async function verifyCode(phone, code) {
  const rows = await query(
    'SELECT id FROM sms_codes WHERE phone = ? AND code = ? AND expire_at > NOW() LIMIT 1',
    [phone, code]
  );
  return rows.length > 0;
}

async function registerByPhone({ phone, code, name }) {
  const valid = await verifyCode(phone, code);
  if (!valid) {
    const err = new Error('验证码错误或已过期');
    err.bizCode = 40001;
    throw err;
  }

  const existing = await query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
  if (existing.length > 0) {
    const err = new Error('手机号已注册，请直接登录');
    err.bizCode = 40902;
    throw err;
  }

  await query(
    `INSERT INTO users (name, phone, user_type, role, status)
     VALUES (?, ?, 'formal', 'registered', 'active')`,
    [name, phone]
  );

  const userRows = await query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
  const user = userRows[0];
  const token = signToken(user);
  return {
    token,
    userInfo: {
      id: String(user.id),
      name: user.name,
      avatar: user.avatar || '',
      userType: user.user_type,
      role: user.role,
      phone: user.phone,
      registerDate: String(user.created_at).slice(0, 10)
    }
  };
}

async function loginByPhone({ phone, code }) {
  const valid = await verifyCode(phone, code);
  if (!valid) {
    const err = new Error('验证码错误或已过期');
    err.bizCode = 40001;
    throw err;
  }

  let rows = await query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
  if (rows.length === 0) {
    await query(
      `INSERT INTO users (name, phone, user_type, role, status)
       VALUES (?, ?, 'temp', 'temp', 'active')`,
      [`临时工${phone.slice(-4)}`, phone]
    );
    rows = await query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
  }

  const user = rows[0];
  const token = signToken(user);
  return {
    token,
    userInfo: {
      id: String(user.id),
      name: user.name,
      avatar: user.avatar || '',
      userType: user.user_type,
      role: user.role,
      phone: user.phone
    }
  };
}

async function loginByEmployee({ employeeId, password }) {
  const rows = await query(
    `SELECT * FROM users
     WHERE employee_id = ? AND password_hash = SHA2(?, 256) AND status = 'active'
     LIMIT 1`,
    [employeeId, password]
  );

  if (rows.length === 0) {
    const err = new Error('工号或密码错误');
    err.bizCode = 40101;
    throw err;
  }

  const user = rows[0];
  const token = signToken(user);
  return {
    token,
    userInfo: {
      id: String(user.id),
      name: user.name,
      avatar: user.avatar || '',
      userType: user.user_type,
      role: user.role,
      employeeId: user.employee_id,
      phone: user.phone
    }
  };
}

module.exports = {
  createOrUpdateCode,
  registerByPhone,
  loginByPhone,
  loginByEmployee
};
