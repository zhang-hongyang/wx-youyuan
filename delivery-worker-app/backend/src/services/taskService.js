const { query } = require('../db/mysql');

async function getTodayTasks(userId) {
  const rows = await query(
    `SELECT
      id,
      order_no AS orderNo,
      customer_name AS customerName,
      address,
      scheduled_time AS scheduledTime,
      goods_count AS goodsCount,
      status,
      status_text AS statusText,
      has_arrive AS hasArrive,
      has_complete AS hasComplete
     FROM tasks
     WHERE assignee_user_id = ?
     ORDER BY id DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  getTodayTasks
};
