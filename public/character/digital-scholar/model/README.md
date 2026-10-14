# 甲骨文数字史官 3D 资产目录

将经过验证的模型文件放入本目录即可启用网页端 3D 入口：

- `digital-scholar.glb`：网页、HyperFrames 和通用 GLTF 查看器
- `digital-scholar.vrm`：VRM 数字人驱动（网页当前保留回退，不强制加载）

当前已通过 Blender 5.2 生成概念级轻量资产：`digital-scholar.blend` 与 `digital-scholar.glb`。模型包含基础人体骨骼和 Idle/Thinking/Speaking/Nod/Blink 动作。由于未安装 VRM 导出插件，未伪造 `.vrm` 文件；后续可从 `.blend` 继续导出。

网页端 `ScholarAvatar` 会通过 HEAD 检查自动加载 GLB；模型缺失、WebGL 不可用或加载失败时继续显示原有立绘。

## 推荐导出约束

- 中等精度网格，单角色纹理建议 2K 或更低
- 骨骼至少包含 `Hips / Spine / Chest / Neck / Head`、双臂和双手
- VRM 配置眨眼、`A/I/U/E/O` 口型、视线和中性/微笑/思考表情
- 输出正面、侧面、背面透明渲染图，供 Figma、Canva 和 Higgsfield 使用
