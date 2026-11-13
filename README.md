<p align="center">
  <strong>Fenfa</strong> &nbsp;·&nbsp; Self-hosted app distribution platform
</p>

<p align="center">
  <a href="https://github.com/openprx/fenfa/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/openprx"><img src="https://img.shields.io/badge/org-OpenPRX-8b5cf6" alt="OpenPRX"></a>
</p>

<p align="center">
  <a href="README.zh-CN.md">中文文档</a>
</p>

---

Fenfa (分发, "distribute" in Chinese) is a self-hosted distribution platform for iOS, Android, macOS, Windows, and Linux apps. Upload builds, get install pages with QR codes, and manage releases through a clean admin panel.

Part of the [OpenPRX](https://github.com/openprx) ecosystem — open-source infrastructure for development teams.

## Features

- **Multi-platform** — iOS (IPA), Android (APK), macOS, Windows, Linux
- **Smart upload** — auto-detect app metadata (bundle ID, version, icon) from packages
- **iOS UDID binding** — device registration flow for ad-hoc distribution
- **Product pages** — public download pages with QR codes and platform detection
- **Admin panel** — manage products, variants, releases, devices, and settings
- **S3/R2 storage** — optional S3-compatible object storage (Cloudflare R2, AWS S3, MinIO)
- **Build retention** — keep the latest N builds per target, with automatic cleanup after uploads (default: 50)
- **Apple Developer API** — auto-register devices to your Apple Developer account
- **Single binary** — Go binary with embedded frontend, just run it
- **SQLite** — zero external dependencies, data in a single file
- **i18n** — Chinese and English UI

## Quick Start

### Docker (recommended)

These examples target ARM64 devices, including a Raspberry Pi running a 64-bit OS. On Intel/AMD x86-64 machines, replace the `:arm64` tag with `:amd64`.

```bash
docker run -d --name fenfa -p 8000:8000 ghcr.io/ivine/fenfa:arm64
```

Visit `http://localhost:8000/admin`, login with token `dev-admin-token`.

**Production** — use custom tokens and persistent storage:

```bash
docker run -d \
  --name fenfa \
  --restart=unless-stopped \
  -p 127.0.0.1:8000:8000 \
  -e FENFA_ADMIN_TOKEN=your-secret-token \
  -e FENFA_UPLOAD_TOKEN=your-upload-token \
  -e FENFA_PRIMARY_DOMAIN=https://your-domain.com \
  -v ./data:/data \
  -v ./uploads:/app/uploads \
  ghcr.io/ivine/fenfa:arm64
```

Or mount a [`config.json`](docs/config.example.json) for full control:

```bash
docker run -d --name fenfa -p 8000:8000 \
  -v ./data:/data -v ./uploads:/app/uploads \
  -v ./config.json:/app/config.json:ro \
  ghcr.io/ivine/fenfa:arm64
```

### GitHub image builds by architecture

Push the workflows to the default branch, then open GitHub Actions and manually run the workflow for your deployment machine:

| Workflow | Native runner | Image |
| --- | --- | --- |
| Build Docker Image (ARM64) | ubuntu-24.04-arm | ghcr.io/ivine/fenfa:arm64 |
| Build Docker Image (AMD64) | ubuntu-24.04 | ghcr.io/ivine/fenfa:amd64 |

Each workflow runs independently, has its own build cache, and publishes using the automatically provided `GITHUB_TOKEN`. Run only ARM64 for a 64-bit Raspberry Pi. Wait for a successful build before pulling the tag. Forks publish under their own repository owner's namespace instead of `ivine`.

These workflows no longer update `latest`. Change the image in your existing `compose.yaml`, preserving your volumes and other settings:

```yaml
services:
  fenfa:
    image: ghcr.io/ivine/fenfa:arm64
```

This snippet only shows the image setting, not a complete deployment configuration. Use `:amd64` on x86-64 machines. From the Compose directory, run:

```bash
docker compose pull && docker compose up -d
```

Private images require logging in to GHCR first. If an old workflow is still running, stop it before using the new workflows. The local helper scripts retain their original defaults; explicitly select and pull the image before running the deployment script:

```bash
docker login ghcr.io
docker pull ghcr.io/ivine/fenfa:arm64
IMAGE=ghcr.io/ivine/fenfa:arm64 sh ./scripts/docker-run.sh
```

To build and push manually, use a Buildx environment capable of building the selected architecture and specify the repository, tag, and platform:

```bash
IMAGE=ghcr.io/ivine/fenfa TAG=arm64 PLATFORMS=linux/arm64 PUSH=true sh ./scripts/docker-build.sh
```

### Build from source

Requirements: Go 1.25+, Node.js 20+

```bash
make build   # builds frontend + backend
make run     # starts the server
```

Or manually:

```bash
cd web/front && npm ci && npm run build && cd ../..
cd web/admin && npm ci && npm run build && cd ../..
go build -o fenfa ./cmd/server
./fenfa
```

## Configuration

See [`docs/config.example.json`](docs/config.example.json) for all options. Full API spec in [`docs/api-spec.md`](docs/api-spec.md).

| Key | Description | Default |
|-----|-------------|---------|
| `server.port` | HTTP port | `8000` |
| `server.primary_domain` | Public URL for manifests and callbacks | `http://localhost:8000` |
| `server.organization` | Organization name in iOS profiles | `Fenfa Distribution` |
| `server.data_dir` | Database directory | `data` |
| `auth.admin_tokens` | Admin API tokens | `["dev-admin-token"]` |
| `auth.upload_tokens` | Upload API tokens | `["dev-upload-token"]` |

### Environment Variables

Override config values without a file:

| Variable | Description |
|----------|-------------|
| `FENFA_PORT` | HTTP port |
| `FENFA_DATA_DIR` | Database directory |
| `FENFA_PRIMARY_DOMAIN` | Public domain URL |
| `FENFA_ADMIN_TOKEN` | Admin token |
| `FENFA_UPLOAD_TOKEN` | Upload token |

### Storage

Files are stored locally by default. S3-compatible storage (R2, AWS S3, MinIO) can be configured in admin panel > Settings > Storage.

The same settings section includes **Builds to keep per target**, a positive integer that defaults to **50**, including on existing installations. The limit applies separately to each target (variant), across all versions and channels. After a successful `/upload` or `/smart-upload`, Fenfa keeps the new build and the latest N−1 previous uploads by upload time, using release ID to break timestamp ties. Build numbers do not affect retention.

Older builds are permanently deleted together with their files, local `meta.json`, provisioning profiles, release events, and download grants. S3/R2 cleanup deletes the object and any local copy left by older uploads; new S3 uploads discard their local staging files after metadata extraction. The storage credentials must allow object deletion (`s3:DeleteObject`). With bucket versioning enabled, deleting an object may retain older object versions according to the bucket policy.

Saving a different limit does not immediately delete existing builds. Each target is cleaned up on its next successful upload. Failed uploads do not trigger retention. Cleanup failures are logged without failing the new upload; affected build records remain for retry on the next upload, so storage errors can temporarily leave more than N builds. Files and objects already orphaned by earlier versions are not discovered by this policy.

## Architecture

```
Request → Gin Router → Auth Middleware → Handler → GORM → SQLite
```

```
cmd/server/          Entry point
internal/server/     HTTP handlers & routing
internal/store/      Database models (GORM + SQLite)
internal/web/        Embedded frontend (go:embed)
web/front/           Public download page (Vue 3 + Vite)
web/admin/           Admin panel (Vue 3 + Vite)
```

## API

Auth via `X-Auth-Token` header. See [`docs/api-spec.md`](docs/api-spec.md) for details.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products/:slug` | — | Product download page |
| GET | `/d/:releaseID` | — | Direct file download |
| POST | `/upload` | upload | Upload a build |
| * | `/admin/api/*` | admin | Admin API |

## Links

- [Documentation](https://docs.openprx.dev/en/fenfa/) — Full documentation (10 languages)
- [Community](https://community.openprx.dev) — OpenPRX community forum

## Contributing

Fenfa is part of [OpenPRX](https://github.com/openprx). Issues and pull requests welcome.

## License

[MIT](LICENSE)
