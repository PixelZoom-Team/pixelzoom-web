"""파비콘을 만든다.

브라우저 탭 아이콘은 16px에서 읽혀야 한다. 그래서 How it Works의 마스코트를
그대로 축소하지 않고, **16×16 격자 위에 따로 그린다.** 축소는 이 제품이 하지
말라고 말하는 바로 그 일이라, 파비콘에서 그걸 하면 앞뒤가 맞지 않는다.

큰 크기는 전부 정수배 확대(nearest)로만 만든다. 32는 ×2, 48은 ×3, 192는 ×12다.

    python scripts/make_favicon.py
"""

from __future__ import annotations

import struct
from pathlib import Path

import cv2
import numpy as np

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public"

# 16×16 전용 도안. 한 글자가 픽셀 하나다.
ICON = [
    "....CCCCCCCC....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    "CCCCCCCCCCCCCCCC",
    "CCCCCCCCCCCCCCCC",
    "CCCWWCCCCCCWWCCC",
    "CCCWWCCCCCCWWCCC",
    "CCCCCCCCCCCCCCCC",
    "CCCCCCCCCCCCCCCC",
    "CCCKCCCCCCCCKCCC",
    "CCCCKCCCCCCKCCCC",
    "CCCCCKKKKKKCCCCC",
    "CCCCCCCCCCCCCCCC",
    ".CCCCCCCCCCCCCC.",
    "..CCCCCCCCCCCC..",
    "....CCCCCCCC....",
]

# BGRA. 본문 색은 theme의 --accent(#6ee7a8)와 같다.
PALETTE = {
    ".": (0, 0, 0, 0),
    "C": (168, 231, 110, 255),
    "K": (42, 22, 22, 255),
    "W": (255, 255, 255, 255),
}

ICO_SIZES = [16, 32, 48]
PNG_SIZES = [32, 192]


def draw() -> np.ndarray:
    size = len(ICON)
    out = np.zeros((size, size, 4), np.uint8)
    for y, row in enumerate(ICON):
        assert len(row) == size, f"row {y} has {len(row)} cells, expected {size}"
        for x, cell in enumerate(row):
            out[y, x] = PALETTE[cell]
    return out


def scaled(base: np.ndarray, size: int) -> np.ndarray:
    factor, remainder = divmod(size, base.shape[0])
    assert remainder == 0, f"{size}는 {base.shape[0]}의 정수배가 아니다"
    return np.repeat(np.repeat(base, factor, axis=0), factor, axis=1)


def png_bytes(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()


def write_ico(path: Path, images: list[tuple[int, bytes]]) -> None:
    """PNG를 담은 ICO를 직접 쓴다.

    Pillow가 이 환경에 없고, 파비콘 하나 만들자고 런타임 의존성을 늘릴 이유는
    없다. ICO는 헤더 6바이트 + 항목 16바이트씩 + 이미지 데이터가 전부다.
    항목의 데이터로 PNG를 그대로 넣는 형식은 현행 브라우저가 모두 읽는다.
    """
    header = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries = b""
    payload = b""
    for size, blob in images:
        # 256은 0으로 적는 규약이 있지만 여기서는 48까지만 쓴다.
        entries += struct.pack(
            "<BBBBHHII", size, size, 0, 0, 1, 32, len(blob), offset
        )
        offset += len(blob)
        payload += blob
    path.write_bytes(header + entries + payload)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    base = draw()

    write_ico(OUT / "favicon.ico", [(s, png_bytes(scaled(base, s))) for s in ICO_SIZES])

    for size in PNG_SIZES:
        cv2.imwrite(str(OUT / f"icon-{size}.png"), scaled(base, size))

    # iOS 홈 화면용. 애플이 권장하는 180은 16의 정수배가 아니라, 정수배인 192로
    # 두고 축소는 OS에 맡긴다. 우리가 반정수 배율로 줄이는 것보다 낫다.
    cv2.imwrite(str(OUT / "apple-touch-icon.png"), scaled(base, 192))

    for path in sorted(OUT.glob("*.ico")) + sorted(OUT.glob("*.png")):
        print(f"  {path.name}  {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
