# 又元运营管理微信小程序

一个面向送货、打卡、问题上报、绩效与报销场景的微信小程序，现已统一切换到微信云开发后端方案。

## 当前技术方案

- 前端：微信小程序原生框架
- 业务后端：云函数 api
- 数据存储：云数据库
- 文件上传：云存储
- 本地缓存：wx.setStorageSync，用于会话与离线兜底

## 当前能力

- 员工与临时工登录
- 今日任务与订单详情
- 上班 / 到达 / 完工打卡
- 问题上报与历史记录
- 报销提交与历史记录
- 绩效与奖金展示

## 项目结构

```text
delivery-worker/
├── cloudfunctions/         # 统一云函数后端入口
├── pages/                  # 页面目录
├── services/               # 业务服务层
├── utils/                  # 通用工具、请求、上传、运行时设置
├── components/             # 组件目录
├── images/                 # 图片资源
├── app.js                  # 应用入口（含云开发初始化）
├── app.json                # 小程序配置
├── app.wxss                # 全局样式
└── project.config.json     # 项目配置（根目录即小程序目录）
```

## 快速开始

1. 用微信开发者工具导入项目
2. 确认 appid 与云开发环境已开通
3. 在开发者工具中安装 cloudfunctions/api 依赖
4. 上传并部署云函数 api
5. 编译运行小程序

## 云开发初始化说明

app.js 会在启动时执行：

- wx.cloud.init({ env: wx.cloud.DYNAMIC_CURRENT_ENV, traceUser: true })
- 初始化 runtimeSettings 默认值

默认 runtimeSettings：

```json
{
  "backendMode": "cloud",
  "allowLocalFallback": false
}
```

## 上传与存储说明

- 图片通过 wx.cloud.uploadFile 直传云存储
- 业务数据中保存 fileID
- 如需临时公网地址，再调用 getTempFileURL

## 注意事项

1. 当前项目不再依赖独立 Express/MySQL 服务
2. 当前默认就是纯云端校验，云数据库缺少集合时会直接报错提示初始化
3. 首次至少先创建并导入 `users` 集合，否则微信登录会失败
4. 项目已迁移为根目录小程序结构，导入项目时直接选择仓库根目录

## 相关文档

- API 契约：API_CONTRACT_DRAFT.md
- 云开发切换指南：INTEGRATION_SWITCH_GUIDE.md
- 最小回归清单：MIN_REGRESSION_CHECKLIST.md
- 更新记录：UPDATE_LOG.md
- 三级文档总览：docs/README.md
- L1 架构蓝图：docs/L1-架构与治理/01-多角色小程序重构蓝图.md
- L2 角色与权限设计：docs/L2-模块设计/01-RBAC与角色路由设计.md
- L3 重构执行SOP：docs/L3-实施与运维/01-重构执行SOP.md
