# 「殷契拾文」甲骨光影 · 赭石琥珀主题 v6

版本：2026-09-08 · 交付方式：CSS Variables / Design Tokens + 本地 SVG，离线无外部依赖。

## 设计原则

- 视觉语言：4K 网页大图感、16:9、抽象甲骨折线稀疏分布边缘、中央大留白、风化骨面肌理、柔和电影光影；
- 全站统一为“暖骨纸 × 赭石 × 琥珀 × 淡鎏金”，不再使用青灰/冷灰/纸白冷调；
- 中央区域保持大留白，甲骨符号只作边缘低透明装饰，不干扰标题与正文；
- 赭石与琥珀仅用于标题关键词、数字、细线、识别结果、图标与 hover，不使用大面积高饱和。

## 色彩令牌（CSS Variables 唯一色源）

| 令牌 | HEX | 用途 |
|---|---|---|
| `paper` | `#F3EDE3` | 暖骨纸全站底 |
| `paperLight` | `#FBF6EC` | 画布/档案卡 |
| `parchment` | `#EADFCC` | 骨面正文卡 |
| `paperSoft` | `#E0D3BC` | 次级浅骨面 |
| `mist` | `#F1E7D8` | 风化骨纹 wash |
| `mistSoft` | `#F9F3E8` | Hero/页头 wash |
| `jade`（语义保留） | `#C28A3D` | 琥珀强调/Active |
| `jadeDeep`（语义保留） | `#9E5B34` | 赭石标题/重点数字 |
| `ink` | `#2B211A` | 深骨棕正文 |
| `inkSoft` | `#4A3C30` | 次级深棕文字 |
| `muted` | `#7B6C59` | 次要正文 |
| `bone` | `#FBF5EA` | 深色按钮上的文字 |
| `soot` | `#2E231B` | 深骨棕按钮/品牌圆标 |
| `sootSoft` | `#4A3A2A` | 按钮 hover |
| `bronze` | `#9E5B34` | 赭石细线/图标/数字 |
| `gold` | `#C28A3D` | 琥珀强调 |
| `goldLight` | `#D9B070` | 淡鎏金高光 |
| `line` | `#D8CCB4` | 骨纹细分割线 |
| `seal` | `#A95638` | 印章点睛 |
| `green` | `#6F7C54` | 成功语义 |
| `amber` | `#9C6B2F` | 待考证语义 |

## 与 v5 的区别

- v5 青灰/纸白冷调全部移除，替换为暖骨纸与赭石琥珀；
- Hero 不再只是淡 wash，叠加 16:9 `hero-bone.svg` 风化骨面背景；
- 新增 `OracleEdgeField`：用真实甲骨字形笔画在 Hero 与页头四边做稀疏折线符号；
- 图表、图谱、画布同步暖化，删除灰绿观感。

## 关键资源与组件

- `public/decor/hero-bone.svg`：16:9 骨面大图（代码版，中央留白，无文字）；
- `src/components/OracleEdgeField.tsx`：甲骨边缘符号背景层（Hero 与 PageShell 共用）；
- `.rubbing-dark`：暖骨 wash（兼容旧名，浅色风化骨面）；
- `.parchment-card` / `.panel`：暖骨卡 + `line` 细边；
- `.btn-primary / .btn-gold / .btn-ghost`：深骨棕/赭石/描边按钮。

## 数字主讲台与贞人立绘

`/digital-human` 中栏为“数字主讲台”展陈，代码内分层 2D 立绘
（`src/components/ScholarAvatar.tsx`，viewBox 420×520）：

- 角色设定：商代贞人 · 束发衣冠，交领袍服 + 青铜带饰；不引入 Live2D/VRM/位图依赖。
- 分层顺序：舞台光晕/地面投影 → 袍服剪影 → 后发大髻/颈部/双耳 → 面部 →
  前发垂发/发笄 → 眉/眼/鼻/口/腮红 → 交领与金线 → 腰束与青铜带饰 → 轮廓微光。
- 配色取自 v6 令牌同源常量：骨纸/羊皮纸、深骨棕 `#2E231B`、赭石 `#9E5B34`、
  琥珀 `#C28A3D`、淡鎏金 `#D9B070`、朱砂 `#A95638` 仅作带饰点缀。
- 状态动画：随机眨眼（3.6–5.8s）、呼吸浮动、讲解轻微点头与口型开合
  （120–180ms 伪随机节奏）、思考微倾；`prefers-reduced-motion` 下完全静止。
- 语音：浏览器 Web Speech API 系统中文音色（`src/lib/scholar/speech.ts`），
  使用“纪录片口播预设”（0.90×/0.95，自然男声优先、本机男声兜底），
  文本按标点与长句自动断句停顿；讲解气泡提供“朗读”入口。
  极淡风声底噪由 `src/lib/scholar/ambience.ts` 用 Web Audio 程序化生成，
  无外部音频素材，音量约 3% 且低于人声，可在语音条一键关闭；
  音色列表只展示系统实际提供项，缺语音时回退纯文字。

## AI 4K 增强（状态：待后续能力可用时生成）

当前未生成 `public/hero/oracle-hero-4k.webp`，代码版 `hero-bone.svg` 即为 Hero 背景交付。
生成提示词与规格见 `docs/design/hero-brief.md`；如后续获得可用图像生成能力，再按该文档补充并压缩 WebP。

## Figma 还原提示

以 `figma-xuanqing.md` 与 `figma-tokens-xuanqing.json` 为还原依据；Figma 中建立 `Xuan/` Color Styles 后按“骨面大图 / 暖骨卡 / 边缘甲骨符号”三层结构落版。
