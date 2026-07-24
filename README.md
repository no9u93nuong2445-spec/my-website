# 心动训练营 V2.0

完全离线的恋爱沟通训练系统，包含 **6 名差异化角色、45 个实战关卡**、自由练习、知识课程、逐句评分、错题专项、个性化诊断、数据备份和本地密码锁。

## 项目结构

- `index.html`：网页版入口，可直接部署到 GitHub Pages。
- `.bootstrap/`：经过校验的离线工程数据包，共 24 个分块。
- `app/`：原生 Android WebView 工程，首次启动时从随包数据中解压网页资源，之后完全本地运行。
- `.github/workflows/pages.yml`：自动部署网页版。
- `.github/workflows/android.yml`：自动构建 Android Debug APK。
- `.github/workflows/verify.yml`：检查离线数据包、网页入口、Android源码和隐私权限。

## 网页版

仓库启用 GitHub Pages 后访问：

`https://no9u93nuong2445-spec.github.io/my-website/`

首次打开会载入仓库中的离线数据分块。训练记录、进度、密码锁和备份数据只保存在当前浏览器本地，不连接任何 AI API。

## Android App

### GitHub Actions 自动构建

打开仓库的 **Actions → Build Android APK**。构建成功后，在运行页面底部下载：

`heart-training-debug-apk`

### 本地构建

需要 JDK 17、Gradle 8.10.2 和 Android SDK 35：

```bash
gradle -p app :app:assembleDebug
```

输出文件：

`app/app/build/outputs/apk/debug/app-debug.apk`

## 隐私与权限

Android 清单没有申请以下权限：

- 网络
- 精确位置
- 通讯录
- 相机
- 麦克风

训练内容和用户数据默认只在设备本地处理。备份由用户主动导出为 JSON 文件。

## 版本

- 当前版本：V2.0
- Android 包名：`com.bianzhifeng.hearttraining`
- 最低 Android：7.0（API 24）
- 目标 Android：API 35
