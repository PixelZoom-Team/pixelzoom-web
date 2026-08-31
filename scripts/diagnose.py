"""어떤 이미지가 왜 블록 탐지에 실패했는지 설명한다.

API는 성공/실패만 돌려주므로, 실패한 이미지를 손에 들고 이유를 물을 곳이
없다. 이 스크립트는 채널별로 어디서 균일성이 깨지는지 짚어 준다.

    conda activate pixelzoom
    python scripts/diagnose.py <이미지 경로>
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import cv2
import numpy as np

from pixelzoom_core import background_mask, content_bbox
from pixelzoom_core.minchunk import TOLERANCE

CHANNELS = {3: ["B", "G", "R"], 4: ["B", "G", "R", "A"], 1: ["Gray"]}


def divisors_of(height: int, width: int) -> list[int]:
    return [d for d in range(2, min(height, width) + 1) if height % d == 0 and width % d == 0]


def per_channel_report(region: np.ndarray, chunk: int) -> list[str]:
    """블록을 좌상단 픽셀로 복제해 되돌린 뒤 채널별 최대 오차를 잰다."""
    reference = region[::chunk, ::chunk]
    restored = np.repeat(np.repeat(reference, chunk, axis=0), chunk, axis=1)
    diff = np.abs(region.astype(np.int16) - restored.astype(np.int16))

    if diff.ndim == 2:
        diff = diff[:, :, None]
    names = CHANNELS.get(diff.shape[2], [str(i) for i in range(diff.shape[2])])

    lines = []
    for index, name in enumerate(names):
        channel = diff[:, :, index]
        worst = int(channel.max())
        over = int(np.count_nonzero(channel > TOLERANCE))
        verdict = "OK" if worst <= TOLERANCE else "실패"
        lines.append(f"        {name}: 최대오차 {worst:3d}  허용({TOLERANCE}) 초과 {over:>8,}px  {verdict}")
    return lines


def describe_alpha(image: np.ndarray) -> None:
    if image.ndim != 3 or image.shape[2] != 4:
        print("  알파 채널 없음 (흰 배경 기준으로 마스크를 만든다)")
        return

    alpha = image[:, :, 3]
    values = np.unique(alpha)
    partial = int(np.count_nonzero((alpha > 0) & (alpha < 255)))
    print(f"  알파 고유값 {len(values)}개  전부불투명={bool(np.all(alpha == 255))}")
    print(f"  반투명(0<a<255) 픽셀 {partial:,}개", end="")
    if partial:
        print("  <-- 안티에일리어싱된 가장자리. 알파 채널이 블록 균일성을 깬다.")
    else:
        print("  (알파는 0/255 뿐)")


def analyse_region(label: str, region: np.ndarray) -> None:
    height, width = region.shape[:2]
    candidates = divisors_of(height, width)
    print(f"\n[{label}] {width}x{height}")
    if not candidates:
        print(f"  공약수가 1뿐이라 후보 블록 크기가 없다 (gcd({width},{height})=1)")
        return

    print(f"  후보 블록 크기: {candidates}")
    for chunk in reversed(candidates):
        reference = region[::chunk, ::chunk]
        restored = np.repeat(np.repeat(reference, chunk, axis=0), chunk, axis=1)
        worst = int(np.abs(region.astype(np.int16) - restored.astype(np.int16)).max())
        if worst <= TOLERANCE:
            print(f"    chunk={chunk:3d}  => 탐지 성공 (최소 단위 {width // chunk}x{height // chunk})")
            return
        print(f"    chunk={chunk:3d}  최대오차 {worst}")
        for line in per_channel_report(region, chunk):
            print(line)
    print("  모든 후보 탈락")


def block_runs(region: np.ndarray, axis: int) -> list[int]:
    """실제 블록의 폭(또는 높이)을 역산한다.

    공약수 탐색은 '블록 크기가 변의 약수'라는 전제를 깔고 있어서, 배율이
    소수점이라 블록 폭이 9px과 10px로 뒤섞인 이미지는 원인을 알려주지 못하고
    그냥 실패한다. 여기서는 값이 바뀌는 경계를 직접 찾아 실제 간격을 잰다.
    """
    flat = region.reshape(region.shape[0], region.shape[1], -1).astype(np.int16)
    if axis == 1:
        lines = flat.transpose(1, 0, 2)  # 열 단위
    else:
        lines = flat  # 행 단위

    boundaries = [0]
    for index in range(1, lines.shape[0]):
        if int(np.abs(lines[index] - lines[index - 1]).max()) > TOLERANCE:
            boundaries.append(index)
    boundaries.append(lines.shape[0])
    return [b - a for a, b in zip(boundaries, boundaries[1:])]


def describe_grid(region: np.ndarray) -> None:
    print("\n[실제 블록 격자 역산]")
    for axis, label in ((1, "가로"), (0, "세로")):
        runs = block_runs(region, axis)
        unique = sorted(set(runs))
        head = ", ".join(str(r) for r in runs[:24]) + (" ..." if len(runs) > 24 else "")
        print(f"  {label} 간격 {len(runs)}개: {head}")

        # 이웃한 블록이 같은 색이면 하나로 이어져 보인다(31 옆의 62처럼). 그러니
        # '값이 여럿'인 것 자체는 흠이 아니고, 전부 같은 격자의 배수인지가 관건이다.
        base = int(np.gcd.reduce(runs))
        if base > 1:
            print(f"    -> 전부 {base}px 격자의 배수다 (같은 색 블록이 이어져 보이는 것)")
        else:
            print(f"    -> {unique} 가 공통 격자를 이루지 못한다  <-- 정수배가 아닌 배율로 늘어난 흔적")


def main(path: str) -> None:
    data = Path(path).read_bytes()
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise SystemExit(f"이미지를 열 수 없다: {path}")

    height, width = image.shape[:2]
    channels = image.shape[2] if image.ndim == 3 else 1
    print(f"파일: {Path(path).name}  ({len(data):,} bytes)")
    print(f"  크기 {width}x{height}, 채널 {channels}")
    describe_alpha(image)

    _, mask = background_mask(image)
    bbox = content_bbox(mask)
    if bbox is None:
        print("\n내용물 마스크가 비었다 — 전부 배경으로 판정됐다.")
        return
    x, y, w, h = bbox
    print(f"\n  내용물 경계: x={x} y={y} {w}x{h}   (여백 좌{x} 상{y} 우{width - x - w} 하{height - y - h})")

    analyse_region("원본 그대로", image)
    analyse_region("배경 크롭 후", image[y : y + h, x : x + w])
    describe_grid(image[y : y + h, x : x + w])


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("사용법: python scripts/diagnose.py <이미지 경로>")
    main(sys.argv[1])
