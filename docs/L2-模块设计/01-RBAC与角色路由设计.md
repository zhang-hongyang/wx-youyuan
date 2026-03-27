# L2-01 RBAC与角色路由设计

更新时间：2026-03-27

## 设计目标

建立可扩展的角色能力模型，避免后续每加角色都改大量硬编码判断。

## 角色定义

首批角色建议：

1. admin（系统管理员）
2. manager（管理者）
3. executor（执行者）
4. finance（财务）
5. warehouse（仓库）

## 能力点（capabilities）建议

1. task:view:own
2. task:view:all
3. task:dispatch
4. project:publish
5. project:review
6. reimbursement:submit
7. reimbursement:review
8. bonus:view:own
9. bonus:view:all
10. employee:manage

## 数据模型建议（兼容现有 users）

在 users 集合保留 role 字段，同时预留 capabilities：

1. role: string
2. capabilities: string[]
3. department: string
4. teamId: string
5. status: active/inactive

## 路由守卫策略

1. 登录后根据 role 决定入口页
2. 页面 onLoad 调用统一守卫函数
3. 前端无权仅做拦截提示，真正权限由云函数判定

## 云函数权限策略

1. 每个管理和财务接口必须显式声明允许角色
2. 关键写接口必须写审计日志
3. 高风险接口单独做资源归属校验

## 首批高风险接口清单

1. /admin/employees/delete
2. /admin/tasks/dispatch
3. /bonus/detail
4. /performance/summary
5. /reimbursements/submit

## 当前实现状态（2026-03-27）

### 已完成（批次A）

1. 小程序端新增统一角色归一化工具与页面守卫基础。
2. 登录后按角色分流到不同入口。
3. 个人页已增加管理者/仓库/财务快捷入口。

### 已完成（批次B）

1. 云函数新增统一角色访问校验助手（支持 Web 管理密钥和小程序角色校验）。
2. /admin/tasks/dispatch 已收紧为 admin/manager。
3. /admin/employees/delete 已收紧为 admin。
4. /admin/tasks/delete 已收紧为 admin/manager。
5. 报销提交、问题提交、奖金申诉、派单/删除操作已接入审计日志。
6. 奖金与绩效读取接口已增加“必须为已绑定账号”校验。
