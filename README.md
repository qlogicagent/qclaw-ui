# qclaw-ui

`qclaw-ui` 是独立于 `openclaw` 的标准聊天执行 UI。

当前阶段目标：

- 保留 openclaw 现有单页聊天体验
- 强化执行过程折叠面板
- 标准化 thinking / tool / step / final 事件
- 为 IM 会话实时刷新提供统一状态层

## workspace

- `packages/protocol`：标准命令与事件类型
- `packages/adapter-openclaw`：openclaw → qclaw-ui 协议归一化
- `packages/client`：占位 client 包
- `packages/react`：占位 React 组件入口
- `packages/theme-openclaw`：占位主题包
- `apps/playground`：本地联调入口
- `apps/docs`：文档演示入口

## 本地启动

1. 进入 [qclaw-ui](qclaw-ui)
2. 执行 `pnpm install`
3. 执行 `pnpm build`
4. 执行 `pnpm dev`
5. 如需独立 mock 演示页，执行 `pnpm dev:docs`

## 当前已落地

- 协议类型定义
- openclaw WS 事件归一化器
- 最小 workspace 构建骨架

## 说明

此仓库当前先做最小可构建版本，不在 v1 阶段复制 DeerFlow 的多分页信息架构。
