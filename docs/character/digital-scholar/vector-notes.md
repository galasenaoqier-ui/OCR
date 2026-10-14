# 矢量版说明（Vector v0.2）

## 性质

- 矢量版由本地 SVG/HTML 代码绘制，不依赖 AI 生图、图片素材或网络。
- 它给出角色在“比例、发型发冠、袍服层次、道具、克制数字科技元素”上的
  视觉基准，不冒充 AI 写实渲染或最终 3D 模型。
- 造型与 `character-brief.md` 保持一致；品牌名只出现在展示板排版层，
  SVG 图内不写入文字，避免错字/乱码。

## 文件

| 文件 | 用途 |
|---|---|
| `board.html` | 主矢量展示板（推荐入口） |
| `vector/scholar-full-front.svg` | 正面全身：宽袖交领袍、腰束、玉佩、简牍、手持甲骨档案牌与扫描线 |
| `vector/scholar-portrait-expression.svg` | 半身肖像：沉静专注 / 温和颔首两种表情 |
| `vector/scholar-back-costume.svg` | 背面与服装结构：发冠背面、袍面层次、束腰与垂饰 |
| `vector/props-tech-legend.svg` | 道具与数字科技图例：档案牌特写、玉佩、简牍、扫描线与全息元素 |

## 配色（与 character-brief 一致）

- 深玄黑 `#111A19`；青铜灰 `#4B5A54`；暗金 `#B99656`；
  米白/骨质 `#E4D9BE`；青蓝点缀 `#7FB5B0`。

## 图案规范

- 图中甲骨纹样仅使用日、月、雨、山等简单象形线条意象，避免随机乱码。
- 数字科技元素（扫描线、漂浮字符、粒子）透明度低、尺寸小，不作为主体。

## Figma 导入步骤

1. 在 Figma 新建 Design File。
2. 将 `vector/` 中任一 SVG 拖入画布，或通过菜单 “Import” 导入。
3. 按 `board.html` 的版式复排：主图 + 三个分区卡片 + 色板与文字说明。
4. 若后续生成 AI 写实位图，再以 `board-ai-raster.html` 为模板替换图片。
