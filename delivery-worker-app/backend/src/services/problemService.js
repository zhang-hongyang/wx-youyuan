const { query } = require('../db/mysql');

async function listByUser(userId) {
  const rows = await query(
    `SELECT
      biz_id AS id,
      type,
      type_name AS typeName,
      type_icon AS typeIcon,
      summary AS description,
      status,
      status_text AS statusText,
      created_at AS createTime
     FROM problem_reports
     WHERE user_id = ?
     ORDER BY id DESC`,
    [userId]
  );
  return rows;
}

async function submit(payload, userId) {
  const summary = payload.remark || `${payload.typeName}上报`;
  await query(
    `INSERT INTO problem_reports (
      biz_id,
      user_id,
      order_id,
      order_no,
      type,
      type_name,
      type_icon,
      detail_json,
      photos_json,
      remark,
      expectation,
      summary,
      status,
      status_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '待处理')
    ON DUPLICATE KEY UPDATE
      detail_json = VALUES(detail_json),
      photos_json = VALUES(photos_json),
      remark = VALUES(remark),
      expectation = VALUES(expectation),
      summary = VALUES(summary),
      updated_at = NOW()`,
    [
      payload.id,
      userId,
      payload.orderId || null,
      payload.orderNo || null,
      payload.type,
      payload.typeName,
      payload.typeIcon || '',
      JSON.stringify(payload.detail || {}),
      JSON.stringify(payload.photos || []),
      payload.remark || '',
      payload.expectation || 'normal',
      summary
    ]
  );
  return { id: payload.id };
}

module.exports = {
  listByUser,
  submit
};
