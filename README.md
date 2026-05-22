# FitPulse

**Train Smarter, Live Stronger**

A mobile fitness app built as a static web app (PWA). The source is split into clean, separate files — HTML for structure, CSS for styling, JavaScript for logic, and JSON for data — and a small Python script bundles it all into a single, installable HTML file. No frameworks, no npm, no server required.

Jump to: [Features](#features) · [Project Structure](#project-structure) · [Quick Start](#quick-start) · [Build](#build) · [Deploy to GitHub Pages](#deploy-to-github-pages) · [Install on iPhone](#install-on-iphone) · [中文说明](#中文说明)

---

## Features

- **Home dashboard** — animated daily stats (steps ring, calories, active time, heart rate) and quick actions.
- **Sign Up / Login** — working forms with validation and session persistence (`localStorage`, with an in-memory fallback).
- **Membership** — three tiers (Basic / Premium / Elite) with a side-by-side compare sheet, priced in AUD.
- **Renewal & Payment** — auto-renew toggle, payment methods, annual discount, animated success screen.
- **Supplement Store** — 10 products across 5 filterable categories, each with a detail page (nutrition, reviews, recommendations) and a fly-to-cart animation.
- **Live** — a live-class feed, an upcoming schedule with reminders, and an interactive Live Room with simulated real-time chat, viewer count, timer, and floating reaction hearts. You can also "Go Live".
- **Shorts** — a vertical, snap-scrolling short-video feed with like / comment / share actions and a composer to post your own clip.
- **Personal Training** — browse coaches, book sessions, chat with a coach.
- **Workout Schedule** — weekly view with a goal ring, streak counter, per-day detail, and add-workout flow.
- **Profile** — account, order history, and settings sheets for Notifications, Connected Devices, and a Help & FAQ section.
- **Membership Card** — a scannable digital card showing the member's tier, with a real QR code and a Code 128 barcode (both generated client-side and verified scannable).
- **Swipe navigation** — swipe left/right to move between the main tabs (they wrap around), and swipe right on a sub-page to go back, with live finger-tracking.
- **PWA-ready** — installable to the iOS home screen, full-screen standalone display, embedded app icons and web app manifest.

## Project Structure

```
fitpulse/
├── index.html                     # Modular app — links the files in css/ and js/
├── css/
│   └── styles.css                 # All styles (design system, layout, animations)
├── js/
│   ├── data.js                    # App data — generated from data/*.json
│   ├── qrcode.js                  # QR Code + Code 128 barcode generators (no deps)
│   └── app.js                     # App logic (routing, rendering, interactions)
├── data/                          # Data sources, in plain JSON
│   ├── products.json              # Store catalogue
│   ├── schedule.json              # Weekly training schedule
│   ├── live.json                  # Live classes, chat users & messages
│   └── shorts.json                # Short-video feed
├── build.py                       # Regenerates js/data.js and bundles the standalone build
├── dist/
│   └── fitpulse-standalone.html   # Single-file build (works offline / installable)
├── README.md
├── LICENSE
└── .gitignore
```

There are two ways to run the same app:

1. **Modular** — open `index.html`. It loads `css/styles.css`, `js/data.js`, and `js/app.js` as separate files. This is the version you edit.
2. **Standalone** — open `dist/fitpulse-standalone.html`. Everything (CSS, JS, data, icons, manifest) is inlined into one file, so it works offline and is easy to share or install.

## Data Format

App data lives in `data/` as plain JSON, so it is easy to read and edit:

- `products.json` — store products (name, price, category, nutrition, reviews).
- `schedule.json` — the seven-day training week.
- `live.json` — upcoming live classes plus the simulated chat users and messages.
- `shorts.json` — the short-video feed.

After editing any JSON file, run `python3 build.py` to regenerate `js/data.js` and rebuild the standalone file.

## Quick Start

This is a static site — nothing to install.

**Just open it:** double-click `index.html`.

**Or run a local server** (recommended, so the PWA and `localStorage` behave correctly):

```bash
# Python 3
python3 -m http.server 8000

# or Node.js
npx serve .
```

Then open `http://localhost:8000`. To preview the mobile layout on a desktop browser, open developer tools and toggle the device toolbar (e.g. iPhone view).

## Build

The build step is optional — the repository already includes a generated `js/data.js` and a built `dist/fitpulse-standalone.html`. Run it after you change the data or source files:

```bash
python3 build.py
```

It does two things:

1. Regenerates `js/data.js` from the JSON files in `data/`.
2. Bundles `index.html` + `css/styles.css` + `js/qrcode.js` + `js/data.js` + `js/app.js` into `dist/fitpulse-standalone.html`.

The script uses only the Python standard library — no dependencies.

## Deploy to GitHub Pages

Because the modular app is plain static files, you can host it for free:

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, select the `main` branch and the `/ (root)` folder, then **Save**.
4. After a minute, the app is live at `https://<your-username>.github.io/<repo-name>/`.

## Install on iPhone

1. Open the deployed URL (or local server URL) in **Safari**.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. Launch FitPulse from its icon — it opens full-screen, like a native app.

## Tech Stack

- Vanilla JavaScript — no framework, no bundler at runtime.
- Hand-written CSS — custom design system, animations, mobile-first layout.
- Inline SVG — all illustrations and icons (no image files to load).
- JSON data sources + a Python build script.
- PWA: `apple-mobile-web-app-*` meta tags, embedded manifest, base64 app icons.

## Design

| Token | Value |
| --- | --- |
| Background | `#0B0C0E` (near-black) |
| Accent | `#D7FF3E` (volt green) |
| Highlight | `#FF4D5E` (coral) |
| Display font | Anton |
| Body font | Manrope |

## License

Released under the [MIT License](LICENSE).

---

## 中文说明

**FitPulse — Train Smarter, Live Stronger**

FitPulse 是一个移动端健身 App，以静态网页（PWA）形式构建。源码被拆分成清晰的独立文件：HTML 负责结构、CSS 负责样式、JavaScript 负责逻辑、JSON 负责数据，并由一个小巧的 Python 脚本把它们打包成一个可安装的单文件 HTML。无框架、无 npm、无需服务器。

### 两种运行方式

1. **模块化版**：打开 `index.html`，它会分别加载 `css/styles.css`、`js/data.js`、`js/app.js`。这是用来开发和修改的版本。
2. **单文件版**：打开 `dist/fitpulse-standalone.html`，所有内容（CSS、JS、数据、图标、清单）都内联到一个文件里，可离线运行，便于分享和安装。

### 目录结构

```
fitpulse/
├── index.html                     # 模块化入口，引用 css/ 和 js/ 里的文件
├── css/styles.css                 # 全部样式
├── js/data.js                     # 应用数据（由 data/*.json 生成）
├── js/qrcode.js                   # 二维码 + Code128 条码生成器（无依赖）
├── js/app.js                      # 应用逻辑
├── data/                          # 数据源（纯 JSON）
│   ├── products.json              # 商店商品
│   ├── schedule.json              # 每周训练计划
│   ├── live.json                  # 直播课程、聊天用户与消息
│   └── shorts.json                # 短视频信息流
├── build.py                       # 由 JSON 生成 data.js，并打包出单文件
├── dist/fitpulse-standalone.html  # 单文件版（可离线/可安装）
├── README.md
├── LICENSE
└── .gitignore
```

### 主要功能

首页数据看板、注册/登录、会员（三档，澳元定价）、续费与支付、补剂商店（5 类共 10 件商品，可筛选）、直播与可互动直播间、短视频信息流（可发布）、私人教练、训练计划、个人中心（通知/已连接设备/帮助）、**可扫描的会员卡**（含真实二维码与 Code128 条形码，并标识会员等级）。支持**左右滑动切换板块（首尾循环）、子页面右滑返回**，以及添加到 iPhone 主屏并全屏运行。

### 数据格式

应用数据放在 `data/` 下的 JSON 文件里，方便阅读和修改：`products.json`（商品）、`schedule.json`（周计划）、`live.json`（直播相关）、`shorts.json`（短视频）。修改任意 JSON 后，运行 `python3 build.py` 即可重新生成 `js/data.js` 并重新打包单文件。

### 快速开始

直接双击 `index.html` 即可打开；或运行本地服务器（推荐，PWA 与 `localStorage` 更完整）：

```bash
python3 -m http.server 8000   # 或 npx serve .
```

然后访问 `http://localhost:8000`。

### 构建（可选）

仓库里已包含生成好的 `js/data.js` 和打包好的 `dist/fitpulse-standalone.html`。修改源文件或数据后，运行：

```bash
python3 build.py
```

该脚本只用 Python 标准库，无任何依赖。

### 部署到 GitHub Pages（免费托管）

把仓库推送到 GitHub → 进入 **Settings → Pages** → **Source** 选择 **Deploy from a branch** → 选 `main` 分支、`/ (root)` 目录 → 保存。稍等一分钟即上线于 `https://<你的用户名>.github.io/<仓库名>/`。

### 在 iPhone 上安装

用 **Safari** 打开网址 → 点击**分享** → **添加到主屏幕** → 从图标启动即可全屏使用。

### 许可证

基于 [MIT 许可证](LICENSE) 发布。
