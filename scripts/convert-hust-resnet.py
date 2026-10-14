# 一次性把 HUST-OBC 官方 ResNet-50（max_val_acc.pth）导出为浏览器 ONNX。
# 使用 bundled Python 运行：
#   python scripts/convert-hust-resnet.py
import json
import sys
from pathlib import Path

import onnxruntime as ort
import torch
from torchvision import models

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parent / "oracle_app" / "datasets" / "hust-obc-repo"
CKPT = REPO / "Validation" / "max_val_acc.pth"
LABEL_MAP = REPO / "Validation" / "Validation_label.json"
OUT_DIR = PROJECT / "public" / "hust"


def main() -> int:
    if not CKPT.exists():
        print(f"缺少官方权重：{CKPT}", file=sys.stderr)
        return 1
    checkpoint = torch.load(str(CKPT), map_location="cpu", weights_only=False)
    print("checkpoint keys:", list(checkpoint.keys()))

    model = models.resnet50(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, 1588)
    state = checkpoint["state_dict"]
    if any(k.startswith("module.") for k in state):
        state = {k[len("module."):]: v for k, v in state.items()}
    missing, unexpected = model.load_state_dict(state, strict=False)
    if missing or unexpected:
        print("missing:", missing[:5], "unexpected:", unexpected[:5])
    model.eval()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    onnx_path = OUT_DIR / "resnet50.onnx"
    dummy = torch.randn(1, 3, 128, 128)
    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        input_names=["input"],
        output_names=["logits"],
        opset_version=17,
        do_constant_folding=True,
    )
    print("ONNX 导出：", onnx_path, onnx_path.stat().st_size / 1024 / 1024, "MB")

    classes = json.loads(LABEL_MAP.read_text(encoding="utf8"))
    class_list = [None] * 1588
    for cat_id, class_id in classes.items():
        class_list[int(class_id)] = cat_id
    model_info = {
        "name": "HUST-OBC ResNet-50 (Validation)",
        "framework": "onnx",
        "file": "/hust/resnet50.onnx",
        "input": {"shape": [1, 3, 128, 128], "name": "input"},
        "output": {"name": "logits"},
        "normalize": {
            "mean": [0.85233593, 0.85246795, 0.8517555],
            "std": [0.31232414, 0.3122127, 0.31273854]
        },
        "source": "https://github.com/Pengjie-W/HUST-OBC Validation/max_val_acc.pth",
        "reportedAccuracy": "94.6% on official Validation_test.json",
        "classes": class_list,
    }
    meta_path = PROJECT / "src" / "data" / "hust" / "model.json"
    meta_path.write_text(json.dumps(model_info, ensure_ascii=False, indent=1), encoding="utf8")
    print("类别映射：", meta_path, "classes=", len(class_list))

    # ONNX Runtime 冒烟对比（CPU）
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    with torch.no_grad():
        logits_torch = model(dummy)
    logits_onnx = sess.run(["logits"], {"input": dummy.numpy()})[0]
    top_torch = int(torch.argmax(logits_torch, dim=1).item())
    top_onnx = int(logits_onnx[0].argmax())
    diff = float((torch.from_numpy(logits_onnx) - logits_torch).abs().max())
    print("smoke: torch_top=", top_torch, "onnx_top=", top_onnx, "max_diff=", diff)
    return 0 if top_torch == top_onnx else 2


if __name__ == "__main__":
    raise SystemExit(main())
