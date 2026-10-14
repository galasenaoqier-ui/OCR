# Figma 还原文档

> 本会话未连接可写 Figma 工具。此目录是可一键还原为 Figma 文件的“设计权威”：
> 网页实现即视觉事实，连接 Figma 后可依据下列令牌、组件与页面结构直接落文件。

建议还原范围：设计系统页（色彩/字体/组件）+ 首页 + AI识甲结果/证据链 +
字库 + 单字详情 + 知识地图 + 答辩 Demo（共约 8 个 Frame）。

推荐创建顺序：

1. 新建“殷契拾文 · 设计系统”Frame（1440×900），依 `tokens.md` 建 Color
   Styles 与 Text Styles；
2. 按组件清单建 Components（Button / Tag / Panel / Glyph Card / Ring /
   Stat / Disclaimer 等），命名前缀 `YQ/`；
3. 页面 Frame 命名 `01-首页`、`02-AI识甲-结果`、`03-字库`、`04-单字详情`、
   `05-知识地图`、`06-答辩Demo`；
4. 导入 `wireframes/*.svg` 到对应 Frame 作为底稿，用设计系统组件替换线框。

## 文件

- `tokens.md`：颜色 / 字体 / 圆角 / 阴影 / 间距令牌
- `components.md`：组件清单、状态与规格
- `wireframes/`：关键页面结构线框（SVG，可直接作为底稿）
