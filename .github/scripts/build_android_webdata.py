from __future__ import annotations

import base64
import gzip
import re
from pathlib import Path

PART_COUNT = 12


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def build_standalone_html() -> bytes:
    index = read('index.html')
    css = read('style.css')
    app = ''.join(read(f'fragments/app-{number:02d}.txt') for number in range(1, 17))

    index = re.sub(r'\s*<link rel="manifest"[^>]*>\s*', '\n', index, count=1)
    index = re.sub(r'\s*<link rel="icon"[^>]*>\s*', '\n', index, count=1)
    index, css_count = re.subn(
        r'<link rel="stylesheet"[^>]*>',
        '<style>\n' + css + '\n</style>',
        index,
        count=1,
    )
    safe_app = app.replace('</script>', '<\\/script>')
    index, js_count = re.subn(
        r'<script src="app\.js\?v=218"></script>',
        '<script>\n' + safe_app + '\n</script>',
        index,
        count=1,
    )
    if css_count != 1 or js_count != 1:
        raise SystemExit(f'无法生成 Android 单文件页面：css={css_count}, js={js_count}')

    payload = index.encode('utf-8')
    required = [b'<!doctype html', '心动训练营'.encode(), b'APP_VERSION = "2.18"', b'</html>']
    if len(payload) < 200_000 or not all(marker in payload for marker in required):
        raise SystemExit(f'Android 单文件页面校验失败：{len(payload)} bytes')
    return payload


def write_parts(payload: bytes) -> None:
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    encoded = base64.b64encode(compressed).decode('ascii')
    width = (len(encoded) + PART_COUNT - 1) // PART_COUNT
    out = Path('webdata')
    out.mkdir(exist_ok=True)
    for old in out.glob('part-*.txt'):
        old.unlink()
    for index in range(PART_COUNT):
        chunk = encoded[index * width:(index + 1) * width]
        if not chunk:
            raise SystemExit(f'第 {index + 1} 个 Android 分块为空')
        (out / f'part-{index + 1:02d}.txt').write_text(chunk + '\n', encoding='ascii')

    restored = gzip.decompress(base64.b64decode(''.join(
        (out / f'part-{index + 1:02d}.txt').read_text(encoding='ascii').strip()
        for index in range(PART_COUNT)
    )))
    if restored != payload:
        raise SystemExit('Android 离线分块回读不一致')
    print(f'Android webdata rebuilt: html={len(payload)} gzip={len(compressed)} base64={len(encoded)}')


write_parts(build_standalone_html())
