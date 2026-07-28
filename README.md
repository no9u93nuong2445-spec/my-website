# 心动训练营 V2.18

完全离线的恋爱沟通训练系统，包含 **6 名差异化角色、45 个实战关卡**、自由练习、知识课程、逐句评分、错题专项、个性化诊断、数据备份和本地密码锁。

## 项目结构

- `index.html`：网页版入口，可部署到 GitHub Pages。
- `fragments/`：对话引擎和页面逻辑源码，共 16 个分片。
- `style.css`：网页和 Android 离线页面共用样式。
- `app/`：原生 Android WebView 工程。
- `.bootstrap/`：历史完整工程恢复包，共 24 个分块。
- `webdata/`：旧版 Android 压缩资源，仅保留兼容和排查用途，V2.18 构建不再依赖它。
- `.github/workflows/pages.yml`：部署网页版。
- `.github/workflows/android.yml`：测试对话引擎、生成离线页面并构建 Android APK。
- `.github/workflows/verify.yml`：检查版本、离线结构和隐私权限。

## 网页版

仓库启用 GitHub Pages 后访问：

`https://no9u93nuong2445-spec.github.io/my-website/`

训练记录、进度、密码锁和备份数据只保存在当前浏览器本地，不连接任何 AI API。

## Android App

### V2.18 离线构建方式

Android 不再读取手工维护的 12 个 `webdata` 分块。

Gradle 在每次构建前自动执行 `generateOfflineHtml`：

1. 读取仓库当前的 `index.html`；
2. 内联 `style.css`；
3. 合并 `fragments/app-01.txt` 到 `app-16.txt`；
4. 生成单文件离线页面；
5. 将该页面随 APK 打包；
6. App 首次启动后复制到本机私有目录运行。

因此网页逻辑升级后，只要重新构建 APK，就会自动带上同一套代码，不再出现网页已经修复、APK 仍是旧聊天引擎的问题。

### GitHub Actions 自动构建

打开仓库的 **Actions → Build Android APK**。构建成功后下载：

`heart-training-v218-debug-apk`

产物包含：

- `app-debug.apk`
- 构建时生成的单文件 `index.html`
- 10 项对话回归测试日志

### 本地构建

需要 JDK 17、Gradle 8.10.2 和 Android SDK 35：

```bash
gradle -p app :app:assembleDebug
```

输出文件：

```text
app/app/build/outputs/apk/debug/app-debug.apk
```

构建时生成的离线页面：

```text
app/app/build/generated/offlineAssets/index.html
```

## 隐私与权限

Android 清单没有申请以下权限：

- 网络
- 精确位置
- 通讯录
- 相机
- 麦克风

训练内容和用户数据默认只在设备本地处理。备份由用户主动导出为 JSON 文件。

## 当前版本

- 网页版本：V2.18
- Android `versionName`：2.1.8
- Android `versionCode`：218
- Android 包名：`com.bianzhifeng.hearttraining`
- 最低 Android：7.0（API 24）
- 目标 Android：API 35
