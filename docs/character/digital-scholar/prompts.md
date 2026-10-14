# 「殷契拾文」甲骨文数字史官 · 生图提示词与记录

模型：`gpt-image-2`（官方图像 API，CLI fallback） · 质量：high · 格式：PNG

> 状态说明：AI 位图生成本轮未执行（等待 `OPENAI_API_KEY` 与联网授权）。
> 当前可交付主入口为本地矢量概念板 `board.html` 与 `vector/` SVG；
> 本文件的 8 个提示词保留给后续 AI 写实图生成使用。

## 一致性锚点（每张图共用）

```text
Original fictional character "Oracle Bone Digital Archivist" for a digital humanities
platform about Chinese oracle-bone script. East Asian male scholar, about 25 years old,
refined classical East Asian features, calm focused intelligent eyes, no heavy makeup,
no idolized influencer face. Natural black long hair gathered into a simple scholarly
topknot with an understated archaic hair crown featuring faint carved oracle-bone script
motifs (real pictograph-like marks only, no gibberish). Original layered wide-sleeve
scholar robes combining Shang-dynasty scribe imagery with traditional Hanfu structure
and restrained futuristic digital-human details. Color palette: deep ink-black, bronze
gray, muted antique gold, ivory white, with very small cool cyan accents. Fabric shows
real woven texture; bronze ornaments show oxidized metal; the oracle-bone archive tablet
he holds has genuine bone texture, carved marks and age erosion. One bronze jade-like
pendant and a small oracle-bone slip hang from the waist. Photorealistic high-end 3D
digital human, PBR materials, film-level lighting, cinematic depth of field, dark
futuristic oracle-bone research space background with database screens, bronze vessel
silhouettes and faint floating oracle characters. Restrained holographic digital text
particles; historical Chinese archaeology remains the visual core, not cyberpunk.
```

## 通用约束

- 图内不得出现任何可读文字、标语、品牌名、水印、Logo；不得出现随机乱码字符。
- 不得出现偶像脸、浓妆、仙侠/玄幻装备、夸张赛博朋克霓虹。
- 同一角色锚点必须逐字保留，不得换人设。

## 八张图清单与记录

| # | 文件名 | 视角/内容 | 尺寸 | 状态 |
|---|---|---|---|---|
| 01 | `01-front-full.png` | 正面全身：一手轻托甲骨数字档案牌，另一手做讲解手势 | 1024×1536 | 待生成 |
| 02 | `02-45-full.png` | 约 45° 全身展示 | 1024×1536 | 待生成 |
| 03 | `03-side-full.png` | 正侧面全身展示 | 1024×1536 | 待生成 |
| 04 | `04-back-full.png` | 背面全身：展示发冠、袍服背面与腰饰 | 1024×1536 | 待生成 |
| 05 | `05-half-portrait.png` | 半身肖像：柔和主光，沉静学者表情 | 1024×1536 | 待生成 |
| 06 | `06-tablet-closeup.png` | 半身/特写：双手展示甲骨数字档案牌与简牍细节 | 1024×1536 | 待生成 |
| 07 | `07-lecture-scene.png` | 讲解场景：宽幅环境，正在讲解甲骨识别与字形 | 1536×1024 | 待生成 |
| 08 | `08-expressions.png` | 同一角色两组克制表情：讲解专注、温和颔首（单图双格肖像拼版） | 1536×1024 | 待生成 |

## 单图差异提示

01 · 正面全身

```text
Full-body front view, centered, calm authoritative pose, one hand gently presenting the
bone archive tablet at chest level, the other hand making a poised explanatory gesture.
Show full robe, crown, pendant and oracle slip.
```

02 · 45° 全身

```text
Full-body three-quarter front-left view, standing naturally, robes layered with clear
texture, oracle-bone archive tablet held low near the waist.
```

03 · 侧面全身

```text
Full-body exact side profile, neutral studio-like pose, showing the silhouette of the
topknot crown, wide sleeves, robe layering and hanging bronze jade pendant.
```

04 · 背面全身

```text
Full-body back view, no face visible, showing the back of the hair crown, the layered
back drape of the wide-sleeve robe, belt ornaments, oracle-bone slip and subtle scanline
glow around the archive tablet held behind or at the side.
```

05 · 半身肖像

```text
Half-body waist-up portrait, front-left soft key light, calm deep scholar expression,
face and hair detail emphasized, oracle-bone tablet partly visible in the frame.
```

06 · 持牌特写

```text
Close-up on both hands presenting the weathered bone archive tablet, showing carved
oracle-bone pictograph marks, a thin holographic scan line above the bone surface, the
bronze jade pendant and small oracle-bone slip on the belt.
```

07 · 讲解场景

```text
Wide cinematic teaching scene in a dark futuristic oracle-bone research archive: the
character stands before a floating translucent database of oracle characters and
bronze-vessel silhouettes, gesturing while a faint scan line reads a large bone tablet.
```

08 · 表情展示

```text
Composed two-panel portrait board of the same character: left panel focused lecturing
expression, right panel gentle authoritative nod with a faint approving smile. Same
face, same costume, same lighting direction; no visible text labels.
```

## CLI 命令模板（每次一张）

```bash
uv run --with openai --with pillow --python <BUNDLED_PYTHON> \
  <IMAGE_GEN_SCRIPT> generate \
  --model gpt-image-2 --quality high \
  --use-case stylized-concept \
  --style "photorealistic 3D digital human concept art, cinematic museum lighting" \
  --size 1024x1536 \
  --prompt "<一致性锚点 + 单图差异提示 + 通用约束>" \
  --out docs/character/digital-scholar/render/01-front-full.png
```

> 生成完成后如实更新“状态”列与失败/重试记录，不虚构未生成的视角。
