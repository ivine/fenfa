
## 内网后台免登录
后台页面和管理 API 免登录；上传及安装包解析保留 Token 校验；客户端密码设置保持独立。

## 默认进入管理后台
访问 localhost:8000 默认进入管理后台，下载目录保留在 /catalog，下载页返回和客户端验证跳转使用下载目录。

## GitHub 多架构容器发布
通过 GitHub Actions 手动构建 AMD64 和 ARM64 镜像并发布到 GHCR，供 64 位树莓派通过 Docker Compose 拉取。使用工作流自带的 GITHUB_TOKEN。
