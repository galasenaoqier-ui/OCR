# Figma Color Styles 参考：「殷契拾文」甲骨光影 · 赭石琥珀

版本：2026-09-08 · 对应代码 `src/index.css` 的 CSS Variables 与 `tailwind.config.js`。

## 建 Style 清单

| Style 名称 | HEX | 用途 |
|---|---|---|
| `Xuan/Paper` | `#F3EDE3` | 暖骨纸全站底 |
| `Xuan/PaperLight` | `#FBF6EC` | 画布/档案卡 |
| `Xuan/Parchment` | `#EADFCC` | 骨面正文卡 |
| `Xuan/PaperSoft` | `#E0D3BC` | 次级浅骨面 |
| `Xuan/Mist` | `#F1E7D8` | 风化骨纹 wash |
| `Xuan/MistSoft` | `#F9F3E8` | Hero/页头 wash |
| `Xuan/Amber` | `#C28A3D` | 琥珀强调/Active |
| `Xuan/Ochre` | `#9E5B34` | 赭石标题/数字 |
| `Xuan/Ink` | `#2B211A` | 深骨棕正文 |
| `Xuan/InkSoft` | `#4A3C30` | 次级文字/图标 |
| `Xuan/Muted` | `#7B6C59` | 次要正文 |
| `Xuan/Bone` | `#FBF5EA` | 深色按钮文字 |
| `Xuan/Soot` | `#2E231B` | 深骨棕按钮/品牌圆标 |
| `Xuan/SootSoft` | `#4A3A2A` | 按钮 hover |
| `Xuan/GoldLight` | `#D9B070` | 淡鎏金高光 |
| `Xuan/Line` | `#D8CCB4` | 骨纹细线 |
| `Xuan/Seal` | `#A95638` | 印章点睛 |
| `Xuan/Green` | `#6F7C54` | 成功/真实计数 |
| `Xuan/AmberSoft` | `#9C6B2F` | 待考证/警示 |

## 手动导入步骤

1. Figma 右侧 `Local styles → Styles → + → Color style`；
2. 名称带 `Xuan/` 前缀便于分组；
3. 结构三档：骨面大图（`MistSoft` + 边缘赭石折线）、暖骨正文（`Paper/Parchment` + `Ink` + `Line`）、琥珀强调（`Amber/Ochre`）；
4. Tokens Studio 类插件可直接导入同目录 `figma-tokens-xuanqing.json`。

## 注意

- 大面积色块只允许暖骨纸/米白 wash；赭石、琥珀作为 15% 内的强调；
- 不再使用青灰冷色；勿混入 v5 的 `#5C7267/#33403A` 等色值。
