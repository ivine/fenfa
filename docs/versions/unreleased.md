# 未发布

- [x] 内网后台免登录，上传和解析保留 Token 校验；上传页面和弹窗提供独立 Token 输入。
- 验证：git diff --check、前台和后台 npm run build、go test ./internal/server/... 均通过。

- [x] 默认入口进入后台，下载目录迁移至 `/catalog`，同步客户端链接。

- [x] GitHub Actions 支持 AMD64、ARM64 镜像构建并发布到 GHCR。

- [x] 中文界面统一使用“平台”命名。

- [x] 按架构拆分容器构建工作流，支持原生 ARM64 构建。

- [x] 上传接口使用 platform_id，兼容旧参数并同步上传入口。
