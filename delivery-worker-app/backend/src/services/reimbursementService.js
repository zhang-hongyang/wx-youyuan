const { query } = require('../db/mysql');

async function listByUser(userId) {
  const rows = await query(
    `SELECT
      biz_id AS id,
      type,
      type_name AS typeName,
      type_icon AS typeIcon,
      amount,
      order_no AS orderNo,
      expense_date AS date,
      status,
      status_text AS statusText
     FROM reimbursement_records
     WHERE user_id = ?
     ORDER BY id DESC`,
    [userId]
  );
  return rows;
}

async function submit(payload, userId) {
  await query(
    `INSERT INTO reimbursement_records (
      biz_id,
      user_id,
      order_id,
      order_no,
      type,
      type_name,
      type_icon,
      amount,
      expense_date,
      description,
      invoices_json,
      bill_images_json,
      other_images_json,
      require_invoice,
      status,
      status_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '审核中')
    ON DUPLICATE KEY UPDATE
      amount = VALUES(amount),
      description = VALUES(description),
      invoices_json = VALUES(invoices_json),
      bill_images_json = VALUES(bill_images_json),
      other_images_json = VALUES(other_images_json),
      updated_at = NOW()`,
    [
      payload.id,
      userId,
      payload.orderId || null,
      payload.orderNo || null,
      payload.type,
      payload.typeName,
      payload.typeIcon || '',
      payload.amount,
      payload.date,
      payload.description || '',
      JSON.stringify(payload.invoices || []),
      JSON.stringify(payload.billImages || []),
      JSON.stringify(payload.otherImages || []),
      payload.requireInvoice ? 1 : 0
    ]
  );

  return { id: payload.id };
}

module.exports = {
  listByUser,
  submit
};
