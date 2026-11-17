#!/usr/bin/env python3
"""本番依存だけを含むインストール可能な ZIP を作成する。"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
slug = "od-block-css-indicator"
source = (root / f"{slug}.php").read_text()
version = re.search(r"^ \* Version: (.+)$", source, re.M).group(1)
if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
    sys.exit("プラグインのバージョンが不正です。")
if json.loads((root / "package.json").read_text())["version"] != version:
    sys.exit("package.json とプラグインのバージョンが一致しません。")
if len(sys.argv) > 1 and sys.argv[1] != version:
    sys.exit("タグとプラグインのバージョンが一致しません。")
output = root / "dist" / f"{slug}.zip"
output.parent.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as temporary:
    stage = Path(temporary) / slug
    stage.mkdir()
    for name in (f"{slug}.php", "README.md", "LICENSE", "composer.json", "composer.lock"):
        shutil.copy2(root / name, stage / name)
    shutil.copytree(root / "languages", stage / "languages")
    subprocess.run(["composer", "install", "--working-dir=" + str(stage), "--no-dev",
                    "--prefer-dist", "--no-interaction", "--no-progress",
                    "--no-scripts", "--no-plugins", "--optimize-autoloader"], check=True)
    if not (stage / "vendor/autoload.php").is_file():
        sys.exit("オートローダーがありません。")
    installed = json.loads((stage / "vendor/composer/installed.json").read_text())
    if installed["dev"] or any(p["name"] == "wp-coding-standards/wpcs" for p in installed["packages"]):
        sys.exit("開発依存が混入しています。")
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(stage.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(stage.parent))
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            sys.exit("ZIP の検証に失敗しました。")
print(output)
