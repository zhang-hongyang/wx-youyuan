const { query } = require('../db/mysql');

async function submitCheckin(payload, userId) {
  await query(
    `INSERT INTO checkins (
      biz_id,
      user_id,
      checkin_type,
      checkin_date,
      checkin_time,
      task_id,
      order_no,
      latitude,
      longitude,
      address,
      photos_json,
      remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.id,
      userId,
      payload.type,
      payload.date,
      payload.time,
      payload.orderId || null,
      payload.orderNo || null,
      payload.location ? payload.location.latitude : null,
      payload.location ? payload.location.longitude : null,
      payload.location ? payload.location.address : null,
      JSON.stringify(payload.photos || []),
      payload.remark || ''
    ]
  );

  if (payload.orderId && payload.type === 'arrive') {
    await query('UPDATE tasks SET has_arrive = 1 WHERE id = ?', [payload.orderId]);
  }
  if (payload.orderId && payload.type === 'complete') {
    await query('UPDATE tasks SET has_complete = 1, status = "completed", status_text = "已完成" WHERE id = ?', [payload.orderId]);
  }

  return { serverId: payload.id };
}

module.exports = {
  submitCheckin
};
