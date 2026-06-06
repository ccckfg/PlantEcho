# PlantEcho 后端 Docker 部署指南

本文用于把 `apps/server` 后端部署到服务器，适合初步上线灰度测试。镜像只包含 Node.js 后端和 `packages/shared`，不会打包本地 `.env`、SQLite 数据库、桌面端产物或硬件源码。

## 镜像信息

- 镜像名：`ccckfg/dyn:latest`
- 最近推送：`2026-05-31`
- 最近 digest：`sha256:52846b636b7fe5daff096c8c8848bb885fc8c76e734d8e1e3f803a0886c54a5c`
- HTTP 端口：`8787`
- MQTT 端口：`1883`
- 容器内数据目录：`/app/data`
- 健康检查：`GET /health`

## 最近一次发布验证

2026-05-31 已完成一次完整后端镜像验证与推送：

```powershell
npm run build --workspace @dyn/shared
npm run build --workspace @dyn/server
npm run test --workspace @dyn/server
docker build -t ccckfg/dyn:latest .
docker push ccckfg/dyn:latest
```

验证结果：

- `@dyn/shared` 与 `@dyn/server` TypeScript 编译通过。
- 后端测试通过：27 个测试全部通过。
- Docker 镜像本地构建通过。
- 本地测试容器 `dyn-e2e-test` 已启动并验证，然后已删除。
- Docker Hub 推送成功：`ccckfg/dyn:latest`。

本地容器验证覆盖：

- `/health` 返回 `ok: true`。
- 账号密码登录后返回 token；未带 token 访问受保护接口返回 401。
- 未认领设备首次上报返回 `PENDING_DEVICE`，并出现在 pending 列表。
- 认领设备并新建植物后返回 `dyn_dev_...` 设备密钥。
- 使用生成的设备密钥再次上报读数，读数写入新植物。
- `GET /api/v1/plants/:plantId/readings/latest` 能读到最新土壤湿度。

## 本地构建与验证

```powershell
docker build -t ccckfg/dyn:latest .

docker run -d --name dyn-e2e-test `
  -p 18787:8787 `
  -p 11883:1883 `
  -e AUTH_TOKEN_SECRET=dyn-local-e2e-secret `
  -e PROACTIVE_ENABLED=false `
  ccckfg/dyn:latest

Invoke-RestMethod http://127.0.0.1:18787/health

$session = Invoke-RestMethod http://127.0.0.1:18787/api/v1/auth/register `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"owner","password":"garden-pass-1","displayName":"园丁"}'
$headers = @{ Authorization = "Bearer $($session.token)" }
Invoke-RestMethod http://127.0.0.1:18787/api/v1/plants -Headers $headers

docker rm -f dyn-e2e-test
```

已验证内容：

- `/health` 可访问。
- 账号密码登录后可访问受保护接口；无 token 返回 401。
- 未认领设备首次上报进入 pending。
- 认领设备并新建植物后，新 `plantId` 可出现在植物列表。
- 使用生成的设备密钥再次上报，读数写入对应植物，不串到默认植物。

## 推送 Docker Hub

先在 Docker Hub 创建仓库：

```text
ccckfg/dyn
```

建议使用 Docker Hub Access Token 登录，不要使用账号密码：

```powershell
docker login -u ccckfg
docker push ccckfg/dyn:latest
```

推送完成后记录 digest：

```powershell
docker buildx imagetools inspect ccckfg/dyn:latest
```

如果出现 `insufficient_scope: authorization failed`，通常是：

- 当前 Docker 未登录 `ccckfg`。
- `ccckfg/dyn` 仓库不存在。
- 登录凭证没有该仓库的 push 权限。

## 服务器部署

在服务器准备持久化目录：

```bash
sudo mkdir -p /opt/dyn/data
cd /opt/dyn
```

创建 `/opt/dyn/dyn.env`：

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=8787
DYN_DATA_DIR=/app/data
MQTT_ENABLED=true
MQTT_HOST=0.0.0.0
MQTT_PORT=1883

AUTH_TOKEN_SECRET=请换成高强度随机字符串
AUTH_TOKEN_TTL_HOURS=168
AUTH_REGISTRATION_ENABLED=true

DEFAULT_PLANT_ID=plant-demo
DEFAULT_DEVICE_ID=esp32-demo

LLM_API_URL=
LLM_API_KEY=
LLM_MODEL_ID=
LLM_TEMPERATURE=0.7

# 可选：简单结构化任务使用；未配置时使用主模型
# URL/Key 留空时复用主模型供应商
SECONDARY_LLM_API_URL=
SECONDARY_LLM_API_KEY=
SECONDARY_LLM_MODEL_ID=
SECONDARY_LLM_TEMPERATURE=0.2

# 植物对话必填
EMBEDDING_PROVIDER=openai-compatible
EMBEDDING_API_URL=
EMBEDDING_API_KEY=
EMBEDDING_MODEL_ID=
EMBEDDING_DIMENSIONS=
RERANK_API_URL=
RERANK_API_KEY=
RERANK_MODEL_ID=

QWEATHER_API_KEY=
QWEATHER_API_HOST=
QWEATHER_DEFAULT_LOCATION=101200113
QWEATHER_CACHE_TTL_SECONDS=600

PROACTIVE_ENABLED=true
PROACTIVE_LLM_ENABLED=true
PROACTIVE_SCAN_INTERVAL_MS=300000
PROACTIVE_WEATHER_COOLDOWN_MS=21600000
PROACTIVE_REMINDER_MAX_DAYS=30
LLM_INPUT_COST_PER_MILLION=0
LLM_OUTPUT_COST_PER_MILLION=0
SECONDARY_LLM_INPUT_COST_PER_MILLION=0
SECONDARY_LLM_OUTPUT_COST_PER_MILLION=0
```

### 方式一：docker run

启动容器：

```bash
docker pull ccckfg/dyn:latest

docker rm -f dyn-server 2>/dev/null || true

docker run -d \
  --name dyn-server \
  --restart unless-stopped \
  --env-file /opt/dyn/dyn.env \
  -v /opt/dyn/data:/app/data \
  -p 8787:8787 \
  -p 1883:1883 \
  ccckfg/dyn:latest
```

### 方式二：Docker Compose

把项目根目录的 `docker-compose.yml` 复制到服务器 `/opt/dyn/docker-compose.yml`，并保证同目录存在 `dyn.env`：

```bash
cd /opt/dyn
test -f dyn.env
docker compose pull
docker compose up -d
```

验证：

```bash
curl http://127.0.0.1:8787/health
curl -X POST http://127.0.0.1:8787/api/v1/auth/login \
  -H "content-type: application/json" \
  -d '{"username":"owner","password":"你的密码"}'
curl -H "Authorization: Bearer <login_token>" http://127.0.0.1:8787/api/v1/plants
docker logs --tail 100 dyn-server
```

## 设备联调

ESP32 HTTP 上报地址：

```text
http://服务器IP:8787/api/v1/devices/<deviceId>/readings
```

MQTT 配置：

```text
host: 服务器IP
port: 1883
username: <deviceId>
password: 认领后生成的 dyn_dev_... 设备密钥
readings topic: dyn/devices/<deviceId>/readings
config topic: dyn/devices/<deviceId>/config
```

新设备首次无密钥连接或上报时会进入 pending。到桌面端设备认领页认领后，后端会生成设备密钥；若设备在线订阅了 config topic，会自动下发密钥。

## 灰度注意事项

- 建议设置 `AUTH_TOKEN_SECRET`；桌面端和移动端连接后端时使用账号密码登录，首次部署后注册第一个管理员账号。
- 管理用户请在服务器上使用后端 CLI，例如 `npm run user --workspace @dyn/server -- list-users`；登录会话可用 `list-sessions` 查看 IP 与 User-Agent。普通用户可在前端账号弹窗中查看并撤销自己的登录会话。
- `docker-compose.yml` 为了便于本地校验，将 `dyn.env` 标记为可选；服务器真实部署时仍必须创建 `/opt/dyn/dyn.env`。
- 植物对话必须配置 LLM 与 embedding API；缺少任一配置时，对话接口返回 `503 CHAT_DEPENDENCIES_NOT_CONFIGURED`。rerank 仍可选。
- SQLite 数据在 `/opt/dyn/data/dyn.sqlite`，升级前先备份 `/opt/dyn/data`。
- 容器默认会 seed 一个 demo 植物和 demo 设备；真实设备建议走 pending → claim 流程。
- 当前仍是单实例 SQLite 部署，不要同时启动多个后端容器写同一个数据目录。
- 外部 LLM / embedding / rerank smoke 会把测试 prompt 发到配置的模型服务，生产前需明确授权后再运行。

## 更新镜像

```bash
docker pull ccckfg/dyn:latest
docker stop dyn-server
docker rm dyn-server
docker run -d \
  --name dyn-server \
  --restart unless-stopped \
  --env-file /opt/dyn/dyn.env \
  -v /opt/dyn/data:/app/data \
  -p 8787:8787 \
  -p 1883:1883 \
  ccckfg/dyn:latest
```

如果使用 Docker Compose：

```bash
cd /opt/dyn
docker compose pull
docker compose up -d
```

回滚时把镜像 tag 固定到上一版，例如 `ccckfg/dyn:v0.1.0`，不要只依赖 `latest`。
