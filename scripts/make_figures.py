"""How it Works 페이지의 설명용 그림을 만든다.

저장소의 샘플 이미지(`image/dot/*.png`)는 출처가 불분명한 팬아트가 섞여 있어
공개 배포물에 싣지 않는다. 대신 여기서 스프라이트를 직접 그린다. 그림이
알고리즘의 실제 동작과 어긋나지 않도록, 블록 크기와 최소 단위는 하드코딩하지
않고 pixelzoom_core에 물어서 확인한다.

**한 절 안의 그림들은 같은 배율로 굽는다.** 화면에서 크기를 비교하게 만들 것이라
그림마다 배율이 다르면 비교 자체가 거짓이 된다. 확대는 PNG에 미리 구워 둔다 —
브라우저가 반정수 배율로 늘이면 브라우저가 만들어 낸 얼룩이 우리가 보여주려는
것과 섞인다.

    python scripts/make_figures.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from pixelzoom_core import detect  # noqa: E402

OUT = ROOT / "frontend" / "src" / "assets" / "how"

# 16x15 오리지널 스프라이트. 한 글자가 도트 하나다.
SPRITE = [
    "......KKKK......",
    "....KKCCCCKK....",
    "..KKCCCCCCCCKK..",
    "..KCCCCCCCCCCK..",
    ".KCCCCCCCCCCCCK.",
    ".KCCWWCCCCWWCCK.",
    ".KCCWKCCCCWKCCK.",
    ".KCCCCCCCCCCCCK.",
    ".KCCCCCCCCCCCCK.",
    ".KCCCKCCCCKCCCK.",
    ".KCCCCKKKKCCCCK.",
    ".KCCCCCCCCCCCCK.",
    "..KCCCCCCCCCCK..",
    "..KKCCCCCCCCKK..",
    "....KKKKKKKK....",
]

# BGRA
PALETTE = {
    ".": (0, 0, 0, 0),
    "K": (42, 22, 22, 255),
    "C": (168, 231, 110, 255),
    "W": (255, 255, 255, 255),
}

# --- 탐지·최소 단위 설명 (1·2단계 그림) ---
#
# 블록 크기를 8로 잡은 것은 2단계 때문이다. 그 절은 작품과 최소 단위 이미지를
# 실제 크기 비율로 나란히 놓는데, 블록이 31이면 최소 단위가 1/31로 찍혀 보이지
# 않는다. 8이면 작품 512px 옆에 최소 단위가 64px으로 앉아, 줄어든 정도가
# 드러나면서도 형체는 알아볼 수 있다.
CHUNK = 8
ART_ZOOM = 4          # 128x120을 512x480으로. 격자 한 칸이 화면에서 32px이 된다.

# --- 워블 시연 (문제 제기 그림) ---
#
# 블록이 클수록 워블이 안 보인다. 블록 31에 1.4배를 걸면 도트 폭이 43과 44로
# 갈리는데, 2% 차이라 눈으로는 구분되지 않는다. 그래서 여기서는 **탐지 가능한
# 가장 작은 블록**을 쓴다. detect()는 블록 1을 자명해로 보고 후보에서 빼므로
# 2가 하한이다. 2에 1.25배를 걸면 도트 폭이 3과 2로 갈려 50% 차이가 난다.
WOBBLE_CHUNK = 2
WOBBLE_SCALE = 1.25
# 원본·naive·PixelZoom 셋 다 같은 배율로 굽는다. 6인 것은 분기 그림 전체가
# 한 화면에 들어와야 하기 때문이다 — 갈라지는 모습을 보여주는 그림인데
# 스크롤해야 두 갈래를 다 볼 수 있으면 그림의 뜻이 사라진다.
WOBBLE_ZOOM = 6

ACCENT = (255, 92, 124, 255)   # BGRA — 그리드 강조
TICK_A = (58, 46, 40, 255)     # 눈금자 밴드 교대색
TICK_B = (110, 86, 72, 255)
BAND = 24


def js_round(value: float) -> int:
    """JS의 Math.round와 같은 반올림.

    파이썬 round()는 절반에서 짝수로 붙는다(round(2.5) == 2). 프론트엔드의
    resize.js가 Math.round를 쓰므로 그림도 같은 규칙을 따라야 한다.
    """
    return int(math.floor(value + 0.5))


def sprite_to_array() -> np.ndarray:
    h, w = len(SPRITE), len(SPRITE[0])
    out = np.zeros((h, w, 4), np.uint8)
    for y, row in enumerate(SPRITE):
        assert len(row) == w, f"row {y} has {len(row)} cells, expected {w}"
        for x, cell in enumerate(row):
            out[y, x] = PALETTE[cell]
    return out


def nearest(image: np.ndarray, width: int, height: int) -> np.ndarray:
    return cv2.resize(image, (width, height), interpolation=cv2.INTER_NEAREST)


def enlarge(image: np.ndarray, factor: int) -> np.ndarray:
    """정수배 확대. resize를 거치지 않아 반올림이 끼어들 여지가 없다."""
    return np.repeat(np.repeat(image, factor, axis=0), factor, axis=1)


def draw_grid(art: np.ndarray, cell: int) -> np.ndarray:
    """블록 경계를 얹는다. 한 칸은 밝게 칠해 '이게 도트 하나'임을 짚는다."""
    out = art.copy()
    h, w = out.shape[:2]

    # 강조할 한 칸 — 왼쪽 눈.
    hx, hy = 4 * cell, 5 * cell
    overlay = out.copy()
    cv2.rectangle(overlay, (hx, hy), (hx + cell - 1, hy + cell - 1), ACCENT, -1)
    out = cv2.addWeighted(overlay, 0.35, out, 0.65, 0)

    for x in range(0, w + 1, cell):
        cv2.line(out, (min(x, w - 1), 0), (min(x, w - 1), h - 1), ACCENT, 1)
    for y in range(0, h + 1, cell):
        cv2.line(out, (0, min(y, h - 1)), (w - 1, min(y, h - 1)), ACCENT, 1)

    cv2.rectangle(out, (hx, hy), (hx + cell - 1, hy + cell - 1), ACCENT, 2)
    return out


def dot_layout(source_width: int, target_width: int, chunk: int) -> tuple[list[int], list[int]]:
    """INTER_NEAREST가 실제로 만들어 낸 도트 경계와 폭.

    이상적인 경계를 계산하는 대신 실제 매핑을 되짚는다. OpenCV는 출력 열 j를
    입력 열 floor(j * src / dst)에서 가져오므로, 그 입력 열이 몇 번째 도트에
    속하는지 보면 각 도트가 출력에서 몇 픽셀을 차지했는지 나온다. 그림이
    주장하는 숫자와 그림 자체가 어긋나지 않게 하려는 것이다.
    """
    dots = [((j * source_width) // target_width) // chunk for j in range(target_width)]
    edges = [0]
    for j in range(1, target_width):
        if dots[j] != dots[j - 1]:
            edges.append(j)
    widths = [edges[i + 1] - edges[i] for i in range(len(edges) - 1)]
    widths.append(target_width - edges[-1])
    return edges + [target_width], widths


def with_ruler(image: np.ndarray, edges: list[int]) -> np.ndarray:
    """도트 폭을 눈으로 셀 수 있게 위쪽에 교대색 눈금자 밴드를 붙인다."""
    h, w = image.shape[:2]
    out = np.zeros((h + BAND, w, 4), np.uint8)
    out[BAND:, :] = image

    for index in range(len(edges) - 1):
        left, right = edges[index], min(edges[index + 1], w)
        out[0:BAND, left:right] = TICK_A if index % 2 == 0 else TICK_B
    for x in edges:
        if 0 <= x < w:
            out[0:BAND, x:x + 1] = ACCENT
    out[BAND - 2:BAND, :] = ACCENT
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    unit_img = sprite_to_array()
    uh, uw = unit_img.shape[:2]

    # ---- 탐지·최소 단위 설명 ----
    art = nearest(unit_img, uw * CHUNK, uh * CHUNK)
    found = detect(art)
    assert found is not None, "생성한 스프라이트에서 블록을 찾지 못했다"
    assert found.chunk_size == CHUNK, f"chunk {found.chunk_size} != {CHUNK}"
    assert (found.height, found.width) == (uh, uw), "최소 단위 크기가 다르다"

    art_big = enlarge(art, ART_ZOOM)
    cv2.imwrite(str(OUT / "unit.png"), unit_img)
    cv2.imwrite(str(OUT / "art.png"), art_big)
    cv2.imwrite(str(OUT / "grid.png"), draw_grid(art_big, CHUNK * ART_ZOOM))

    # ---- 워블 시연 ----
    source = nearest(unit_img, uw * WOBBLE_CHUNK, uh * WOBBLE_CHUNK)
    small = detect(source)
    assert small is not None and small.chunk_size == WOBBLE_CHUNK, (
        "워블 예시의 원본을 우리 알고리즘이 탐지하지 못하면, "
        "'PixelZoom이 이렇게 한다'는 주장이 거짓이 된다"
    )

    source_h, source_w = source.shape[:2]
    naive_w = js_round(source_w * WOBBLE_SCALE)
    naive_h = js_round(source_h * WOBBLE_SCALE)
    naive = nearest(source, naive_w, naive_h)

    # PixelZoom은 도트당 픽셀 수를 정수로 스냅한다. 요청 배율이 아니라 이
    # 스냅된 값이 결과를 결정한다 — resize.js의 targetSize와 같은 식이다.
    clean_chunk = js_round(WOBBLE_CHUNK * WOBBLE_SCALE)
    clean = nearest(unit_img, uw * clean_chunk, uh * clean_chunk)

    source_edges = [d * WOBBLE_CHUNK for d in range(uw + 1)]
    naive_edges, naive_widths = dot_layout(source_w, naive_w, WOBBLE_CHUNK)
    clean_edges = [d * clean_chunk for d in range(uw + 1)]

    figures = {
        "wobble-source": (source, source_edges),
        "wobble-naive": (naive, naive_edges),
        "wobble-clean": (clean, clean_edges),
    }
    sizes = {}
    for name, (image, edges) in figures.items():
        # 셋 다 같은 배율이라, 화면에서의 크기 차이가 곧 실제 크기 차이다.
        big = with_ruler(enlarge(image, WOBBLE_ZOOM), [e * WOBBLE_ZOOM for e in edges])
        cv2.imwrite(str(OUT / f"{name}.png"), big)
        sizes[name] = (image.shape[1], image.shape[0], big.shape[1], big.shape[0])

    print(f"[탐지/최소단위] chunk={found.chunk_size}  minchunk={uw}x{uh}")
    print(f"  art   {art.shape[1]}x{art.shape[0]}  -> x{ART_ZOOM} = {art_big.shape[1]}x{art_big.shape[0]}")
    print(f"  unit  {uw}x{uh}  (화면에서 x{ART_ZOOM} = {uw * ART_ZOOM}x{uh * ART_ZOOM})")
    print(f"  step3 예시: round({CHUNK} x 1.4) = {js_round(CHUNK * 1.4)} -> "
          f"{uw * js_round(CHUNK * 1.4)}x{uh * js_round(CHUNK * 1.4)}")
    print(f"[워블] 원본 블록 {WOBBLE_CHUNK}, 요청 배율 {WOBBLE_SCALE}, 표시 배율 x{WOBBLE_ZOOM}")
    for name, (w, h, bw, bh) in sizes.items():
        print(f"  {name:<14} {w}x{h}  -> {bw}x{bh}")
    print(f"  naive 도트 폭={naive_widths[:8]}...")
    print(f"  스냅: 도트당 {clean_chunk}px -> 실제 배율 {clean_chunk / WOBBLE_CHUNK}")
    for path in sorted(OUT.glob("*.png")):
        print(f"  {path.name}  {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
