# 云开发运行切换指南（云端优先 / 本地兜底）

更新时间：2026-03-07

## 1. 目标

当前项目已取消外部 Express/MySQL 依赖，统一使用微信云开发：

1. 业务请求通过云函数 api 处理
2. 数据存储通过云数据库 collections 持久化
3. 文件上传通过 wx.cloud.uploadFile 写入云存储

---

## 2. 当前运行设置

存储键：runtimeSettings

默认值：

```json
{
  "backendMode": "cloud",
   "allowLocalFallback": false
}
```

说明：

- backendMode 固定为 cloud，不再支持 customBaseUrl
- allowLocalFallback 为 true 时，云端失败会回退到本地 mock / storage
- allowLocalFallback 为 false 时，云端失败直接抛错，便于排查问题

---

## 3. 在开发者工具中切换

在微信开发者工具 Console 执行：

### 开启纯云端校验模式

```javascript
wx.setStorageSync('runtimeSettings', {
  backendMode: 'cloud',
  allowLocalFallback: false
});
```

### 开启云端优先 + 本地兜底

```javascript
wx.setStorageSync('runtimeSettings', {
  backendMode: 'cloud',
  allowLocalFallback: true
});
```

执行后重新编译小程序。

---

## 4. 云函数与云存储准备

1. 在微信开发者工具中确认已开通云开发环境
2. 确认项目根目录已识别 cloudfunctions
3. 对 cloudfunctions/api 执行“安装依赖”
4. 上传并部署云函数 api
5. 首次至少先创建 `users` 集合并导入员工数据
6. 如需订单/客户/派单联调，再创建 `customers`、`tasks`、`assignments`

---

## 5. 当前云端主链路

- 登录：services/authService.js
- 今日任务：services/taskService.js
- 打卡提交：services/checkinService.js
- 订单详情：services/deliveryService.js
- 报销：services/reimbursementService.js
- 问题上报：services/problemService.js
- 奖金：services/bonusService.js
- 绩效：services/performanceService.js

---

## 6. 常见问题

1. 提示“不支持云开发”
   - 检查基础库版本和开发者工具版本
2. 提示“未实现的云接口”
   - 检查 cloudfunctions/api 是否已重新上传部署
3. 图片上传失败
   - 检查当前云环境是否有云存储权限
4. 一直显示本地数据
   - 检查 allowLocalFallback 是否仍为 true
5. 云函数返回旧逻辑
   - 删除旧构建缓存后重新编译，并重新部署云函数
6. 点击微信登录提示 collection not exists
   - 先在云开发控制台创建 `users` 集合
   - 导入员工初始化数据后再重新测试
