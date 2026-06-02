# GitHub Actions 客户端构建

`.github/workflows/tauri-clients.yml` 会在推送 `main`、推送 `v*` / `app-v*` tag 或手动触发时构建客户端产物：

- Windows x64：Tauri Windows 安装包（MSI / NSIS）。
- macOS arm64：Apple Silicon 桌面客户端。
- macOS x64：Intel Mac 桌面客户端。
- Android：release 模式、使用私有 keystore 签名的 APK/AAB。

构建产物会作为 GitHub Actions workflow artifacts 上传到对应 run 页面。

## Android release 签名 secrets

Android release 包必须使用私有 keystore 签名。workflow 会拒绝生成 unsigned 或 debug APK，避免出现“无法安装”或“debug 包特别大”的情况。

在本机生成 keystore：

```powershell
keytool -genkey -v -keystore "$env:USERPROFILE\upload-keystore.jks" -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

把 keystore 转成 Base64：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\upload-keystore.jks"))
```

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中新增：

- `ANDROID_KEY_BASE64`：上一步输出的 Base64 文本。
- `ANDROID_KEY_ALIAS`：生成 keystore 时的 alias，例如 `upload`。
- `ANDROID_KEY_PASSWORD`：生成 keystore 时输入的密码。当前 workflow 按 Tauri 官方示例让 store password 与 key password 使用同一个值。

不要把 `.jks`、`keystore.properties` 或密码提交到仓库。

## macOS / Windows 签名说明

当前 workflow 负责自动编译并上传 Windows/macOS 安装产物，但没有接入商业代码签名证书或 Apple notarization。Android 已接入 release keystore 签名。后续如果要让 macOS/Windows 产物适合公开分发，需要再补 Apple Developer ID / notarization secrets 和 Windows 代码签名证书。

## 参考

- Tauri GitHub Action：`tauri-apps/tauri-action@v0.6.2`。
- Android SDK 初始化：`android-actions/setup-android@v3`。
- Android signing：CI 中生成 `src-tauri/gen/android/keystore.properties` 并 patch `app/build.gradle.kts` 的 release signingConfig。
