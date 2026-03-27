# 云开发字段契约草案（v1.0）

> 日期：2026-03-07
> 目的：统一小程序与微信云开发后端的数据契约。

## 通用约定

- 传输层：小程序通过 wx.cloud.callFunction 调用云函数 api
- 路由层：仍沿用 REST 风格 path，便于 service 层保持稳定
- 文件上传：通过 wx.cloud.uploadFile 直接上传到云存储
- 统一返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

code = 0 表示成功，其他为业务错误。

---

## 1. 调用协议

云函数名：api

请求参数：

```json
{
  "path": "/tasks/today",
  "method": "GET",
  "data": {},
  "header": {
    "Authorization": "Bearer <token>",
    "X-Idempotency-Key": "optional"
  }
}
```

说明：

- path 为业务路由标识，不是 HTTP 域名
- token 为云端会话占位字段，目前由云函数返回并在前端缓存
- 上传文件不走该云函数，走云存储直传

---

## 2. 认证模块

### 微信登录
- path: /auth/login/wechat
- method: POST

请求：

```json
{
  "code": "wx.login() 返回的临时 code"
}
```

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "bound": false,
    "pendingOpenId": "oABc***9xyz"
  }
}
```

说明：

- 如果该微信号已绑定员工档案，则返回 `bound=true` 和 `userInfo`
- 如果尚未绑定，则返回 `bound=false`，前端进入首次绑定页
- 当前版本不再内置前端或云函数假登录，必须依赖云数据库 `users` 集合中的真实员工档案

### 首次绑定员工档案
- path: /auth/bind/wechat
- method: POST

请求：

```json
{
  "employeeId": "EMP001",
  "bindCode": "WX-EMP001",
  "name": "张三",
  "code": "wx.login() 返回的临时 code"
}
```

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "cloud_session_token",
    "userInfo": {
      "id": "EMP1700000000000",
      "name": "张三",
      "avatar": "",
      "userType": "formal",
      "employeeId": "EMP001",
      "role": "staff",
      "department": "配送部",
      "skills": ["家具安装", "设备调试"],
      "phone": "138****9999",
      "entryDate": "2023-03-01"
    }
  }
}
```

- `employeeId` 和 `bindCode` 必须来自云数据库 `users` 集合中预先导入的员工记录

---

## 3. 任务与订单

### 今日任务列表
- path: /tasks/today
- method: GET

响应 data 为数组，字段示例：

```json
[
  {
    "id": "1",
    "orderNo": "ZL-20241028-001",
    "customerName": "XX会展公司",
    "address": "上海市浦东新区张江高科技园区XX路123号",
    "scheduledTime": "09:00-11:00",
    "goodsCount": 15,
    "status": "doing",
    "statusText": "进行中",
    "hasArrive": true,
    "hasComplete": false
  }
]
```

### 订单详情
- path: /orders/{orderId}
- method: GET

### 订单扩展详情
- path: /orders/{orderId}/detail
- method: GET

### 货品清单
- path: /orders/{orderId}/goods
- method: GET

### 问题记录
- path: /orders/{orderId}/problems
- method: GET

### 客户评价
- path: /orders/{orderId}/rating
- method: GET

### 临时工申请信息
- path: /orders/{orderId}/temp-worker-request
- method: GET

---

## 4. 打卡模块

### 提交打卡
- path: /checkin/submit
- method: POST

请求：

```json
{
  "id": "local_generated_id",
  "type": "work",
  "date": "2026-03-07",
  "time": "08:20",
  "timestamp": 1770000000000,
  "photos": ["cloud://env-id/delivery-worker/work/xxx.jpg"],
  "location": {
    "latitude": 31.2304,
    "longitude": 121.4737,
    "address": "上海市浦东新区..."
  },
  "remark": "",
  "userId": "u_1001",
  "orderId": "2",
  "orderNo": "ZL-20241028-002"
}
```

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "serverId": "local_generated_id"
  }
}
```

---

## 5. 文件上传模块

上传方式：wx.cloud.uploadFile

存储路径建议：

- delivery-worker/invoice/*
- delivery-worker/bill/*
- delivery-worker/problem/*
- delivery-worker/evidence/*
- delivery-worker/common/*

返回：

```json
{
  "fileID": "cloud://env-id/delivery-worker/problem/xxx.jpg"
}

---

## 6. 后台管理模块

说明：

- 当前云函数已提供最小后台接口，供内部管理工具或运维工具直接对接
- 调用人必须已在 `users` 集合中绑定，且 `role` 为 `admin` 或 `warehouse`

补充权限说明（2026-03-27）：

1. 奖金与绩效读取接口已按角色收敛：
  - `admin/manager/finance/warehouse` 可查看全量
  - 其他角色仅可查看本人记录
2. 财务审核接口：
  - `GET /admin/reimbursements`（admin/finance/manager）
  - `POST /admin/reimbursements/review`（admin/finance）

### 员工列表
- path: /admin/employees
- method: GET

### 保存员工
- path: /admin/employees/save
- method: POST

请求示例：

```json
{
  "employeeId": "ADM001",
  "name": "系统管理员",
  "role": "admin",
  "department": "运营中心",
  "phone": "13800000000",
  "bindCode": "ADM-202603",
  "skills": ["派单", "结算"]
}
```

### 客户列表
- path: /admin/customers
- method: GET

### 保存客户
- path: /admin/customers/save
- method: POST

请求示例：

```json
{
  "customerId": "CUS001",
  "name": "上海示例会展有限公司",
  "settlementType": "monthly",
  "contacts": [
    {
      "name": "王经理",
      "phone": "13900000000"
    }
  ],
  "invoiceInfo": {
    "title": "上海示例会展有限公司",
    "taxNo": "91310000XXXXXX"
  }
}
```

### 订单列表
- path: /admin/tasks
- method: GET

### 保存订单
- path: /admin/tasks/save
- method: POST

请求示例：

```json
{
  "id": "TASK20260307001",
  "orderNo": "ZL-20260307-001",
  "customerId": "CUS001",
  "customerName": "上海示例会展有限公司",
  "customerPhone": "13900000000",
  "address": "上海市浦东新区世纪大道100号",
  "scheduledTime": "2026-03-08 09:00-11:00",
  "goodsCount": 15,
  "status": "pending",
  "statusText": "待派单"
}
```

### 派单
- path: /admin/tasks/dispatch
- method: POST

请求示例：

```json
{
  "taskId": "TASK20260307001",
  "staffIds": ["EMP001", "EMP002"],
  "vehicleId": "沪A12345",
  "remark": "上午场优先到场"
}
```

---

## 7. 推荐云数据库集合

- users：员工档案、角色、绑定码、openId
- customers：客户主数据、联系人、结算方式、开票信息
- tasks：订单与派单执行主表
- assignments：每次派单记录
- checkins：打卡记录
- problems：异常上报
- reimbursements：报销单
- bonus_history：奖金历史
- performance_snapshots：绩效月快照
- performance_rankings：绩效排行榜
```

说明：

- 业务表中统一保存 fileID
- 需要临时访问地址时，再调用 getTempFileURL

---

## 6. 报销模块

### 可选订单列表
- path: /orders/available
- method: GET

### 报销历史
- path: /reimbursements/history
- method: GET

### 提交报销
- path: /reimbursements/submit
- method: POST

请求核心字段：

```json
{
  "id": "rb_001",
  "orderId": 1,
  "orderNo": "ZL-20241028-001",
  "type": "parking",
  "amount": "25.00",
  "invoices": ["cloud://env-id/delivery-worker/invoice/1.jpg"],
  "billImages": ["cloud://env-id/delivery-worker/bill/1.jpg"],
  "otherImages": [],
  "status": "pending",
  "statusText": "审核中"
}
```

---

## 7. 问题上报模块

### 我的问题列表
- path: /problems/my
- method: GET

### 提交问题
- path: /problems/submit
- method: POST

请求核心字段：

```json
{
  "id": "problem_xxx",
  "type": "goods",
  "orderId": 1,
  "orderNo": "ZL-20241028-001",
  "photos": ["cloud://env-id/delivery-worker/problem/1.jpg"],
  "remark": "折叠椅缺少2把",
  "expectation": "urgent",
  "detail": {}
}
```

---

## 8. 奖金与绩效模块

### 奖金详情
- path: /bonus/detail
- method: GET

### 奖金历史
- path: /bonus/history
- method: GET

### 奖金申诉
- path: /bonus/appeal
- method: POST

### 绩效汇总
- path: /performance/summary
- method: GET

### 绩效趋势
- path: /performance/trend
- method: GET

### 绩效排名
- path: /performance/rankings
- method: GET

---

## 9. 错误码字典

| code | 含义 | 场景 |
|------|------|------|
| 0 | 成功 | 全部 |
| 40001 | 参数错误 | 缺少必填字段 |
| 40401 | 接口未实现或资源不存在 | 路由未匹配 |
| 40901 | 业务冲突 | 手机号已注册 |
| 50001 | 云开发服务异常 | 云函数内部错误 |

---

## 10. 当前云端 Collections 约定

- users
- tasks
- order_goods
- checkins
- reimbursements
- problems
- temp_worker_requests
- order_ratings
- bonus_history
- bonus_appeals
- performance_snapshots
- performance_rankings
