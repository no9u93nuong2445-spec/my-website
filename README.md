# 心动训练营 V2.19

完全离线的恋爱沟通训练系统，包含 **6 名独立性格角色、45 个实战关卡**、教练/沉浸双模式、语义三层识别、隐藏挑战、自由练习、知识课程、错题专项、训练报告、数据备份和本地密码锁。

## V2.19 核心升级

### 1. 六名角色真正差异化

每名角色拥有独立的话题偏好、提问容忍度、理想消息长度、主动程度和压力恢复速度。相同一句话面对不同角色，评分、关系指标和回复投入可能不同。

### 2. 动作、对象、上下文三层识别

系统不只看关键词，还会识别：

- 用户正在做什么：分享、提问、安慰、邀约、收尾或尊重拒绝；
- 用户在谈什么对象：她的情绪、自己的经历、共同活动或关系边界；
- 用户是否承接当前内容或最近三轮话题。

### 3. 教练与沉浸双模式

- **教练模式**：每句话立即显示评分、问题原因、语义识别和修改方向。
- **沉浸模式**：聊天中隐藏分数、兴趣、压力和提示，结束后统一复盘，更接近真实交流。

两种模式可以在设置页或训练页面中切换。

### 4. 每关隐藏挑战

正式关卡会自动分配一个额外挑战，例如先听后说、拒绝查户口、完整交换、体面收尾或尊重边界。挑战不会替代原关卡目标，完成后额外奖励 8 XP，并在结算页揭晓。

## 项目结构

- `index.html`：网页版入口，可部署到 GitHub Pages。
- `app.js`：Jekyll 组合入口，负责加载基础分片和 V2.19 兼容层。
- `fragments/app-01.txt` 到 `app-16.txt`：原有对话引擎和页面逻辑。
- `fragments/app-v219-overlay.txt`：V2.19 真人感训练层。
- `style.css`：网页和 Android 离线页面共用样式。
- `app/`：原生 Android WebView 工程。
- `.github/scripts/build_v219_app.py`：生成可直接测试的 V2.19 JavaScript。
- `.github/scripts/dialogue_v219_harness.js`：16 项对话回归测试。
- `.github/workflows/pages.yml`：部署网页版。
- `.github/workflows/android.yml`：测试对话引擎、生成离线页面并构建 Android APK。
- `.github/workflows/verify.yml`：检查版本、离线结构和隐私权限。

## 网页版

仓库启用 GitHub Pages 后访问：

`https://no9u93nuong2445-spec.github.io/my-website/`

训练记录、进度、模式设置、密码锁和备份数据只保存在当前浏览器本地，不连接任何 AI API。

## Android App

### V2.19 离线构建方式

Gradle 在每次构建前自动执行 `generateOfflineHtml`：

1. 读取当前 `index.html` 和 `style.css`；
2. 合并 16 个基础 JavaScript 分片；
3. 注入 `app-v219-overlay.txt`；
4. 生成完整单文件离线页面；
5. 校验 V2.19、角色参数和隐藏挑战标记；
6. 将页面随 APK 打包；
7. App 首次启动后复制到本机私有目录运行。

因此网页逻辑升级后，重新构建 APK 就会自动带上同一套源码。

### GitHub Actions 自动构建

打开仓库的 **Actions → Build Android APK**。构建成功后下载：

`heart-training-v219-debug-apk`

产物包含：

- `app-debug.apk`
- 构建时生成的单文件 `index.html`
- 16 项对话回归测试日志

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

- 网页版本：V2.19
- Android `versionName`：2.1.9
- Android `versionCode`：219
- Android 包名：`com.bianzhifeng.hearttraining`
- 最低 Android：7.0（API 24）
- 目标 Android：API 35
