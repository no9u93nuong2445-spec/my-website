from __future__ import annotations

import sys
from pathlib import Path

EXPORT_MARKER = '  if (typeof globalThis !== "undefined") {'


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def build() -> str:
    parts = [read(f"fragments/app-{number:02d}.txt") for number in range(1, 17)]
    v219 = read("fragments/app-v219-overlay.txt")
    v220 = read("fragments/app-v220-overlay.txt")
    v221 = read("fragments/app-v221-overlay.txt")

    parts[0] = parts[0].replace(
        'const APP_VERSION = "2.0";',
        'const APP_VERSION = "2.21";',
        1,
    )
    parts[15] = parts[15].replace(
        'APP_VERSION: "2.18"',
        'APP_VERSION: "2.21"',
        1,
    )

    if parts[15].count(EXPORT_MARKER) != 1:
        raise SystemExit("app-16导出插入标记数量异常")
    if any(overlay.count(EXPORT_MARKER) != 1 for overlay in (v219, v220, v221)):
        raise SystemExit("V2.19、V2.20或V2.21兼容层缺少唯一导出恢复标记")

    combined = v219.replace(EXPORT_MARKER, v220, 1)
    combined = combined.replace(EXPORT_MARKER, v221, 1)
    parts[15] = parts[15].replace(EXPORT_MARKER, combined, 1)
    app = "".join(parts)
    required = [
        'const APP_VERSION = "2.21"',
        'APP_VERSION: "2.21"',
        "ROLE_PERSONALITIES_V219",
        "REAL_SCENARIOS_V220",
        "REPLAY_VERSION_V221",
        "buildSessionReplayV221",
        "findTurningPointsV221",
        "renderReplayHtmlV221",
    ]
    if not all(marker in app for marker in required):
        raise SystemExit("V2.21生成脚本缺少关键标记")
    return app


def main() -> None:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "app-v221-generated.js")
    target.write_text(build(), encoding="utf-8")
    print(f"V2.21 app generated: {target} ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
