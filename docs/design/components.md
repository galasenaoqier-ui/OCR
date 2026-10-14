# 组件清单（还原到 Figma Components）

命名统一前缀 `YQ/`，变体以状态命名。

| 组件 | 状态/规格 |
| --- | --- |
| `YQ/Button/Primary` | 墨黑底骨白字，圆角 999，高度 44；Hover 青铜深 |
| `YQ/Button/Ghost` | 1px Bronze 45% 描边透明底；Hover Paper 底 |
| `YQ/Button/Gold` | 暗金底墨字（答辩 Demo 入口） |
| `YQ/Chip` | 胶囊标签/筛选；Active = Ink 底 Bone 字 |
| `YQ/Tag` | 状态胶囊：neutral / green / amber / gold |
| `YQ/Panel` | Paper 底 1px Line 描边，圆角 16，含纸纹可选 |
| `YQ/GlyphCard` | 甲骨 SVG + 现代字 + 拼音；Hover 上浮 4px |
| `YQ/GlyphShape` | 100×100 viewBox，笔画宽 3.4；墨色 |
| `YQ/Ring` | 环形进度：青铜轨道、数值居中 |
| `YQ/StatBlock` | 大号楷体数字 + 小号说明 |
| `YQ/Disclaimer` | 琥珀/中性提示条，带图标 |
| `YQ/StepRow` | 编号 + 标题 + 副标题 + 状态图标 |
| `YQ/EvidenceChain` | 01–04 垂直证据链段落 |
| `YQ/Navbar` | 固定高 64；滚动后 Bone 88% + blur |
| `YQ/Footer` | 三栏：品牌 / 站内导航 / 数据来源 |

## 关键交互动效（Framer Motion 口径）

- 页面淡入 0.55s ease-out
- 卡片 Hover：`-translate-y-1` + 阴影加深，0.3s
- 识别步骤：扫描式逐行点亮，每步约 300ms
- 滚动 Reveal：位移 18px + 淡入，once
- 时间轴/环形进度：缓出 1s
- `prefers-reduced-motion` 全部收敛为瞬时
