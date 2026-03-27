USE delivery_worker;

INSERT INTO users (name, phone, employee_id, password_hash, user_type, role, status)
VALUES
('张三', '13800000001', 'EMP001', SHA2('123456', 256), 'formal', 'formal', 'active'),
('李四', '13800000002', 'EMP002', SHA2('123456', 256), 'formal', 'formal', 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password_hash = VALUES(password_hash),
  user_type = VALUES(user_type),
  role = VALUES(role),
  status = VALUES(status);

INSERT INTO tasks (assignee_user_id, order_no, customer_name, address, scheduled_time, goods_count, status, status_text, has_arrive, has_complete)
VALUES
(1, 'ZL-20260217-001', 'XX会展公司', '上海市浦东新区张江高科技园区', '09:00-11:00', 15, 'doing', '进行中', 1, 0),
(1, 'ZL-20260217-002', 'YY科技公司', '上海市徐汇区漕河泾开发区', '14:00-16:00', 8, 'pending', '待开始', 0, 0),
(1, 'ZL-20260217-003', 'ZZ商贸中心', '上海市静安区南京西路', '17:00-19:00', 12, 'pending', '待开始', 0, 0)
ON DUPLICATE KEY UPDATE
  customer_name = VALUES(customer_name),
  address = VALUES(address),
  scheduled_time = VALUES(scheduled_time),
  goods_count = VALUES(goods_count),
  status = VALUES(status),
  status_text = VALUES(status_text),
  has_arrive = VALUES(has_arrive),
  has_complete = VALUES(has_complete);
