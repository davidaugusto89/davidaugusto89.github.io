#!/usr/bin/env python3
"""Rasteriza o SVG com Chromium, sem dependências Python externas."""

import base64
import html
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import tempfile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "assets/icons"
SOURCE = (ICONS / "ti-icon.svg").read_text()
CHROMIUM = os.environ.get("CHROMIUM") or shutil.which("chromium")
if not CHROMIUM:
    raise SystemExit("Chromium não encontrado. Defina CHROMIUM com o caminho do executável.")

# iOS e Android aplicam suas próprias máscaras: o fundo deve cobrir todo o canvas.
# O símbolo permanece igual, inteiramente dentro do círculo seguro de raio 40%.
full_bleed = ET.fromstring(SOURCE)
full_bleed.find("{http://www.w3.org/2000/svg}rect").set("rx", "0")
sources = [SOURCE, ET.tostring(full_bleed, encoding="unicode")]
jobs = [
    ("favicon-16", 16, 0),
    ("favicon-32.png", 32, 0),
    ("favicon-48.png", 48, 0),
    ("apple-touch-icon.png", 180, 1),
    ("icon-192.png", 192, 0),
    ("icon-512.png", 512, 0),
    ("icon-maskable-192.png", 192, 1),
    ("icon-maskable-512.png", 512, 1),
]
uris = ["data:image/svg+xml;base64," + base64.b64encode(s.encode()).decode() for s in sources]
page = """<!doctype html><meta charset="utf-8"><body><script>
(async () => {
  const images = await Promise.all(SOURCES.map(src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  })));
  const output = {};
  for (const [name, size, source] of JOBS) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.getContext('2d').drawImage(images[source], 0, 0, size, size);
    output[name] = canvas.toDataURL('image/png').split(',')[1];
  }
  document.body.textContent = JSON.stringify(output);
})().catch(error => { document.body.textContent = String(error); });
</script>""".replace("SOURCES", json.dumps(uris)).replace("JOBS", json.dumps(jobs))

with tempfile.TemporaryDirectory(prefix="card-icons-") as temporary:
    page_path = Path(temporary) / "render.html"
    page_path.write_text(page)
    result = subprocess.run(
        [CHROMIUM, "--headless", "--disable-gpu", "--no-sandbox",
         "--disable-dev-shm-usage", f"--user-data-dir={temporary}/profile",
         "--no-first-run", "--no-default-browser-check", "--dump-dom",
         "--virtual-time-budget=5000", page_path.as_uri()],
        capture_output=True, text=True, check=True, timeout=30,
    )
    body = re.search(r"<body>(.*?)</body>", result.stdout, re.S)
    output = json.loads(html.unescape(body.group(1)))

pngs = {name: base64.b64decode(output[name], validate=True) for name, _, _ in jobs}
for name, size, _ in jobs:
    png = pngs[name]
    if png[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", png[16:24]) != (size, size):
        raise SystemExit(f"PNG inválido: {name}")
for name, png in pngs.items():
    if name.endswith(".png"):
        (ICONS / name).write_bytes(png)

# ICO com três imagens PNG embutidas, usando apenas a biblioteca padrão.
entries = [(16, pngs["favicon-16"]), (32, pngs["favicon-32.png"]), (48, pngs["favicon-48.png"])]
directory = bytearray(struct.pack("<HHH", 0, 1, len(entries)))
offset = 6 + 16 * len(entries)
for size, png in entries:
    directory.extend(struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(png), offset))
    offset += len(png)
(ROOT / "favicon.ico").write_bytes(directory + b"".join(png for _, png in entries))
print("Gerados 7 PNGs e favicon.ico (16, 32 e 48 px) a partir de ti-icon.svg.")
