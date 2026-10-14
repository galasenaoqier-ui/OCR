# 数据说明

- `glyphs.json`：69 字本地矢量字形，由 `npm run data:export` 从桌面端
  `oracle_app/oracle_db.py` 一次性导出，是精品字库唯一字形数据源。
  不要手工修改其中矢量笔画；如需扩展，请回写桌面端数据库后重新导出。
- `hust/`：HUST-OBC 学术字形目录（含 `index.json` 与生成说明），
  由 `npm run data:import-obc` 生成；原始大图在
  `oracle_app/datasets/HUST-OBC/`，网页仅内置精选示例与模板索引。
- `evolution.json` + `public/evo/`：EVOBC 金文/篆书/隶书图版索引与
  规范化 PNG，由 `npm run data:import-evo` 生成；原始数据在
  `oracle_app/datasets/EVOBC/`（元数据 + 按需缓存，不进入网页提交物）。
