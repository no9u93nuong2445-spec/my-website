from __future__ import annotations

import sys
from pathlib import Path

EXPORT_MARKER = '  if (typeof globalThis !== "undefined") {'


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def build() -> str:
    parts = [read(f"fragments/app-{number:02d}.txt") for number in range(1, 17)]
    overlay = read("fragments/app-v219-overlay.txt")

    parts[0] = parts[0].replace(
        'const APP_VERSION = "2.0";',
        'const APP_VERSION = "2.19";',
        1,
    )
    parts[15] = parts[15].replace(
        'APP_VERSION: "2.18"',
        'APP_VERSION: "2.19"',
        1,
    )

    if parts[15].count(EXPORT_MARKER) != 1:
        raise SystemExit("app-16导出插入标记数量异常")
    if EXPORT_MARKER not in overlay:
        raise SystemExit("V2.19兼容层缺少导出恢复标记")

    parts[15] = parts[15].replace(EXPORT_MARKER, overlay, 1)
    app = "".join(parts)
    required = [
        'const APP_VERSION = "2.19"',
        'APP_VERSION: "2.19"',
        "ROLE_PERSONALITIES_V219",
        "HIDDEN_GOALS_V219",
        "classifySemanticV219",
    ]
    if not all(marker in app for marker in required):
        raise SystemExit("V2.19生成脚本缺少关键标记")
    return app


def main() -> None:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "app-v219-generated.js")
    target.write_text(build(), encoding="utf-8")
    print(f"V2.19 app generated: {target} ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
