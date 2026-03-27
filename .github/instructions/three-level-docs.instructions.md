---
applyTo: "**/*.{md,js,json,wxml,wxss}"
description: "Use when maintaining delivery-worker docs/code; enforce three-level documentation and RBAC-first changes"
---

# Three-Level Documentation Guardrails

## 必须同步更新文档

当发生以下改动时，必须同步更新对应层级文档：

1. 新增角色、权限、导航入口：更新 L1 与 L2
2. 新增或变更接口：更新 L2
3. 变更部署、排障、回归步骤：更新 L3

## 文档质量标准

1. 明确目的、范围、输入输出
2. 给出可执行步骤，不写空泛描述
3. 引用具体文件和接口路径
4. 标注更新时间和负责人

## 代码质量标准

1. 权限检查必须后端优先
2. 错误码与报错文案可追踪
3. 关键写操作记录审计日志
4. 回归清单可直接执行
