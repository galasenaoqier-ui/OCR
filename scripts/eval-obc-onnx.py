# 用官方 Validation_test.json 抽样评估 ONNX 模型（浏览器同口径预处理）。
# 用法：python scripts/eval-obc-onnx.py [抽样数]
import json
import random
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parent / "oracle_app" / "datasets" / "hust-obc-repo"
META = json.loads((PROJECT / "src" / "data" / "hust" / "model.json").read_text(encoding="utf8"))
TEST_JSON = json.loads((REPO / "Validation" / "Validation_test.json").read_text(encoding="utf8"))

N = int(sys.argv[1]) if len(sys.argv) > 1 else 200
random.seed(20260903)

MEAN = np.array(META["normalize"]["mean"], dtype=np.float32)
STD = np.array(META["normalize"]["std"], dtype=np.float32)

session = ort.InferenceSession(str(PROJECT / "public" / "hust" / "resnet50.onnx"), providers=["CPUExecutionProvider"])

def preprocess(p):
    img = Image.open(p).convert("RGB")
    w, h = img.size
    if w > h:
        canvas = Image.new("RGB", (w, w), (255, 255, 255))
        canvas.paste(img, (0, (w - h) // 2))
        img = canvas
    else:
        canvas = Image.new("RGB", (h, h), (255, 255, 255))
        canvas.paste(img, ((h - w) // 2, 0))
        img = canvas
    img = img.resize((128, 128), Image.BILINEAR)
    arr = np.asarray(img, dtype=np.float32).transpose(2, 0, 1) / 255.0
    for c in range(3):
        arr[c] = (arr[c] - MEAN[c]) / STD[c]
    return arr[None]

def evaluate(indices):
    top1 = 0
    top5 = 0
    for n, i in enumerate(indices):
        item = TEST_JSON[i]
        path = REPO.parent / item["path"].replace("\\", "/").replace("../", "", 1)
        x = preprocess(path)
        y = session.run(None, {"input": x})[0][0]
        order = np.argsort(-y)[:5]
        if item["label"] == order[0]: top1 += 1
        if item["label"] in order: top5 += 1
        if (n + 1) % 50 == 0:
            print(f"  {n + 1}/{len(indices)} top1={top1}/{n + 1} top5={top5}/{n + 1}")
    return top1, top5

total = len(TEST_JSON)
step = max(1, total // N)
indices = list(range(0, total, step))[:N]
print(f"评估 {len(indices)} 个官方测试样本…")
top1, top5 = evaluate(indices)
print(f"RESULT top1={top1}/{len(indices)} ({top1 / len(indices):.2%}) top5={top5}/{len(indices)} ({top5 / len(indices):.2%})")
