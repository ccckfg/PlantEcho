# PlantEcho 安卓端构建指南

PlantEcho 移动端 UI 已内置于 `apps/desktop` 同一套前端代码中，通过**运行时检测**（安卓平台或窄视口 `<768px`）自动切换到移动外壳（底部 Tab 导航 + 顶部 AppBar + 竖屏页面）。桌面端行为完全不变。

本指南只覆盖把同一套前端打成安卓 APK 的步骤。生成 APK 需要本机已安装 Android 工具链。

## 前置条件（本机）

- **JDK 17**（建议 Temurin / Microsoft OpenJDK）。
- **Android SDK + NDK**：通过 Android Studio 的 SDK Manager 安装，并设置环境变量：
  - `ANDROID_HOME` 指向 SDK 根目录。
  - `NDK_HOME` 指向 `$ANDROID_HOME/ndk/<version>`。
- **Rust 安卓目标**：
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```
- `@tauri-apps/cli` 已在 `apps/desktop/package.json` 中（无需额外安装）。

## 初始化安卓工程（一次性）

```bash
cd apps/desktop
npx tauri android init
```

这会生成 `src-tauri/gen/android`（已被 `.gitignore` 忽略的派生工程）。`src-tauri/src/lib.rs` 已有 `#[cfg_attr(mobile, tauri::mobile_entry_point)]`、`Cargo.toml` 已含 `cdylib` crate-type，无需改动。

> **标识符提示**：`tauri.conf.json` 的 `identifier` 为 `app.dyn.plant-echo`。安卓包名段不允许连字符，Tauri 会把 `plant-echo` 中的 `-` 自动转为 `_`（即包名形如 `app.dyn.plant_echo`）。若希望包名更干净，可在 init 前把 identifier 改为无连字符的形式（如 `app.dyn.plantecho`）。

## 明文 HTTP（连局域网后端必读）

PlantEcho 后端默认跑在 `http://192.168.x.x:8787`（明文 HTTP）。Android 9+ 默认禁止明文流量，需在 init 生成的工程里开启一次：

编辑 `src-tauri/gen/android/app/src/main/AndroidManifest.xml`，在 `<application>` 标签上加：

```xml
<application
    android:usesCleartextTraffic="true"
    ... >
```

（更严格的做法是配 `network-security-config` 仅放行内网网段，此处用最简单的全局开关。）

> 这是 init 后的手动步骤；重新执行 `tauri android init` 会重建该文件，需要再次添加。

## 联调与构建

```bash
cd apps/desktop

# 真机/模拟器热重载联调（USB 调试需先 adb 连上设备）
npx tauri android dev

# 出包（生成 APK / AAB）
npx tauri android build
```

产物位于 `src-tauri/gen/android/app/build/outputs/`。

## 真机验收清单

- 底部 4 Tab（温室 / 对话 / 日记 / 相册）可切换，active 态正确。
- 顶部状态栏、底部手势条均有安全区留白，内容不被遮挡。
- 首页一键浇水的 5 秒撤销 toast 出现在底部居中、TabBar 之上。
- 对话页：流式回复正常、快捷动作可点、输入框吸底、当前状态可折叠展开。
- 相册：上传走系统相册选图；删除走二次确认；lightbox 全屏查看。
- 相册：lightbox 点击「保存」后，照片写入系统相册的 `Pictures/PlantEcho`，底部出现保存成功 toast。
- 设备认领弹窗（顶部 AppBar「设备」入口）在窄屏≈全宽展示。
- 连本地后端：在「更换后端」里填入 `http://<电脑局域网IP>:8787`，再用账号密码登录；首次使用可注册首个管理员账号，读数随同步刷新。

## 网络要求

- 手机与后端需在**同一 2.4/5G 局域网**；后端地址用电脑的局域网 IP，不能用 `127.0.0.1`（那是手机自身）。
- 手机端不能用 `127.0.0.1` 访问电脑上的后端；登录方式与桌面端一致，都是后端地址 + 账号密码。

## 相册保存实现

- Tauri 安卓端通过内置 `gallery` 移动插件调用 Android `MediaStore`，不会把「保存」误走成系统分享。
- Android 10 及以上使用分区存储写入 `Pictures/PlantEcho`，不需要申请宽泛的存储权限。
- Android 9 及以下仅在保存时申请旧版相册写入权限。
