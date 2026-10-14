# 「殷契拾文」Web 平台

基于 OCR 技术的甲骨文拓片文字智能识别与检索系统 · React + TypeScript + Vite 单页应用。

让三千年前的文字，再次被看见。

## 一键启动

```bash
npm install
npm run dev          # http://localhost:5173
```

生产构建与离线预览：

```bash
npm run build
npm run preview      # http://localhost:4173
```

运行测试与自检：

```bash
npm test             # 引擎 69 字自识等单元测试
```

浏览器内页脚「系统自检」(/status) 可逐字执行 69 字识别验证。

导入 HUST-OBC 公开学术字形（可选；已有生成产物时网页可直接运行）：

```bash
npm run data:import-obc   # 读取 ../oracle_app/datasets/HUST-OBC 并重新生成索引/示例图/模板
```

导入 EVOBC 字形演变图版（金文 / 篆书 / 隶书；可选，已有生成产物时网页可直接运行）：

```bash
npm run data:import-evo -- --preflight   # 只打印 69 字 × 三阶段覆盖率，不下载
npm run data:import-evo                  # 按需下载并规范化图版（联网，约 3300 张）
```

## 页面

| 路由 | 页面 |
|---|---|
| `/` | 首页 |
| `/about` | 项目介绍（背景、目标、技术路线、模块、数据规范与创新点） |
| `/recognize` | AI识甲（ResNet-50 本地模型识别：示例 / 手写 / 上传；手写低置信时以本地 69 字矢量匹配复核并标注） |
| `/library` | 甲骨字库（精品 69 + HUST 已释/未释/待复核，搜索与分页） |
| `/my-library` | 我的甲骨库（个人上传图片数据库，IndexedDB 本机保存、搜索/编辑/一键识别） |
| `/character/:id` | 单字详情与字形演变 |
| `/hust/:entryId` | HUST-OBC 学术字形详情（已释/未释/待复核来源） |
| `/evolution` | 字形演变总览（本地矢量甲骨 + EVOBC 金文/篆书/隶书图版） |
| `/compare` | 字形对比实验室 |
| `/knowledge` | 互动知识地图 |
| `/digital-human` | 数字史官（殷契灵境 · 本地知识讲解 + 系统中文语音朗读） |
| `/character/digital-scholar/board.html` | 数字史官 · 矢量角色概念板（静态页，含正面全身/表情/背面/道具图） |
| `/learning` | AI 学甲骨（三关互动学习） |
| `/data` | 识别与学习数据（本地真实识别/反馈统计） |
| `/demo` | 60–90 秒答辩 Demo |
| `/status` | 系统自检 |

## 数字史官（殷契灵境）

- 讲解文本由本地知识引擎生成（本地 69 字字库、字形演变、甲骨知识词条与数据来源），
  每条附“AI 生成讲解 · 请以专业文献为准”声明，不冒充专家释读。
- 朗读采用“纪录片口播预设”（Web Speech API，零依赖）：自动选择自然男声
  （Yunyang/Yunjian/Yunxi 等），离线或自然男声不可用时自动回退本机男声；
  语速 0.90×、音高 0.95，文本按标点与长句自动断句停顿，并带可一键关闭的
  极淡风声环境底噪（Web Audio 程序化生成，无外部音频素材）。
- 语音支持单条朗读、自动朗读、暂停/继续/停止与中文音色选择；语音可用性、
  音色数量与自然男声是否联网取决于浏览器和操作系统，页面只展示系统实际
  提供的中文音色。无中文语音或浏览器不支持时自动回退为纯文字。

## 数据与引擎

- 字形数据：`src/data/glyphs.json` 由 `npm run data:export` 从桌面端
  `oracle_app/oracle_db.py` 导出，共 69 字，不改写桌面端数据。
- HUST-OBC 学术数据：`src/data/hust/index.json` 与 `public/hust/*`
  由 `npm run data:import-obc` 生成（已释 1,588 类 / 77,064 源图，
  未释目录 9,408 类 / 62,989 源图，待复核 1,390 类 / 5,019 源图），
  许可 CC BY-NC 4.0，非商业/学习用途需保留出处。
- EVOBC 字形演变图版：`src/data/evolution.json` 与 `public/evo/*`
  由 `npm run data:import-evo` 生成（当前 1,438 个标签条目 / 3,361 张唯一图版，
  约 32 MB；本地 69 字中 68 字金文、篆书、隶书三阶段齐全，仅「米」在 EVOBC
  中无金文样本故该阶段留缺），来源为 EVOBC（arXiv:2401.12467），
  许可 CC BY-NC-SA 4.0，网页提交物不携带原始约 5 GB 数据包。
- 识别引擎：`src/lib/engine/` 将 Chamfer + 双向覆盖率算法移植为
  TypeScript，在浏览器本地完成二值化、归一化、匹配与 Top-K；无需 Python。
- 学术大库模式：`src/lib/engine/hustEngine.ts` + Worker 从
  `templates.bin`（128×128 距离变换索引）做浏览器本地匹配，
  只把“已释”类别作为候选；未释 9,408 目录不参与识别输出。
- ResNet-50 学术模型：`public/hust/resnet50.onnx`（约 102 MB，官方
  `max_val_acc.pth` 导出）经 `modelEngine.ts` 在浏览器本地 ONNX 推理；
  官方 Validation 测试集 Top-1 约 94.6%，实测抽样 200 张 Top-1 95.0%、
  Top-5 99.0%。服务接口 `RecognitionService` 保持统一，预留远端模型扩展。
- AI 识甲页面固定使用 ResNet-50 模型，不再提供引擎切换；69 字与
  模板引擎仍保留在 `/status` 与 `/demo` 中作为工程对照。

## 诚实数据原则

- 甲骨文用本地矢量字形；金文/篆书/隶书只展示 EVOBC 公开字形图版并标注来源
  与许可，未匹配到样本的阶段才显示“资料待补充”，绝不用现代字体冒充出土字形。
- HUST-OBC 图像统一标注“公开学术字形样本”，释义/拼音仅本地精品字库有值。
- 学术大库自检按实测显示命中率，不硬编码、不虚报准确率。
- ResNet-50 识别注明“官方测试集 94.6%”与“任意上传不保证”，页面显示的是真实浏览器推理结果。
- `/data` 只展示本机真实识别/反馈与演示学习报告，不再显示未采集的实践指标。
- 低置信识别不显示确定答案，只提供考证提示，不自动写入任何档案。
- “已实现 / Demo / 规划中”状态在对应界面均有明确标识。
## GitHub Pages 部署

项目已包含 `.github/workflows/deploy-pages.yml`。将代码推送到 GitHub 仓库的 `main` 或 `master` 分支后，Actions 会自动构建并发布 H5。

首次配置：

1. 在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
2. 确认仓库启用了 Git LFS；`public/hust/resnet50.onnx` 和 `public/hust/templates.bin` 通过 LFS 管理。
3. 等待 `Deploy H5 to GitHub Pages` 工作流完成，访问 `https://<用户名>.github.io/<仓库名>/`。

GitHub Pages 使用 HashRouter，页面链接形如 `/#/recognize`，可直接分享和刷新。

本地扫码分享：

```bash
npm run h5:share
```

脚本会使用 `tools/cloudflared.exe` 启动 Quick Tunnel，并覆盖生成 `public/qr/yinqi-h5.png`、`public/qr/yinqi-h5.svg` 和 `public/qr/yinqi-h5-url.txt`。Quick Tunnel 关闭后临时地址失效。
