# Hero 4K 图版 Brief（待生成）

版本：2026-09-08 · 状态：代码版已上线；AI 4K 位图待后续能力可用时生成。

## 用途

首页 Hero 全屏背景增强层，尺寸 3840×2160（16:9），与现有暖骨视觉无缝融合；中心必须保持大面积可放置标题的留白。

## 图像提示词（可复用）

```text
Use case: product-mockup
Asset type: culture project landing page hero background
Primary request: 16:9 cinematic bone-surface background for an oracle-bone digital humanities website
Style/medium: refined museum digital art / soft cinematic illustration, no characters, no people
Composition/framing: wide 3840x2160 landscape; abstract oracle-bone incised angular line symbols sparse around all four edges; large empty calm center for headline copy
Lighting/mood: soft warm film light, gentle vignette from top right, restrained and premium
Color palette: ochre #9E5B34, amber #C28A3D, pale gold #D9B070, warm bone ivory #F3EDE3
Materials/textures: weathered ancient bone surface with delicate cracks and micro-grain, high-res
Text: no text, no letters, no watermark, no logo
Avoid: dense symbols, neon, blue/gray cast, text, fake 3D chrome, low-res noise
```

## 落位与命名

1. 生成 3840×2160 位图；
2. 检查无文字/水印、中心留白充足；
3. 压缩导出为 WebP（目标 <3MB），保存 `public/hero/oracle-hero-4k.webp`；
4. 在首页 Hero 以 `<img>` 或 `background-image` 增强层引用，并保留 `hero-bone.svg` 作为离线回退。

## 约束

- 本文件不虚构生成状态；未生成时不得在代码中引用不存在的 WebP；
- 页面默认使用 `public/decor/hero-bone.svg`（代码版），保证离线构建可用。
