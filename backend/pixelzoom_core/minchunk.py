"""최소 단위 이미지(MinChunk) 탐지."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# 원본 dot_resizer_v3.compare_images는 absdiff를 30으로 threshold 한 뒤 비영
# 픽셀 수를 센다. 즉 채널당 30 이하의 차이는 같은 블록으로 본다. 손실 압축을
# 거친 이미지를 받아내기 위한 여유이므로 동작 일치를 위해 그대로 유지한다.
TOLERANCE = 30


@dataclass(frozen=True)
class MinChunk:
    """탐지된 블록 크기와, 그 기준으로 정규화한 최소 단위 이미지의 크기."""

    chunk_size: int
    width: int
    height: int


def _is_block_uniform(image: np.ndarray, chunk: int, tolerance: int = TOLERANCE) -> bool:
    """모든 chunk×chunk 블록이 허용 오차 안에서 단색인지 검사한다.

    원본은 INTER_NEAREST로 축소했다가 되돌린 뒤 absdiff로 비교했다. 정수 배수
    축소에서 INTER_NEAREST는 각 블록의 좌상단 픽셀을 고르므로 그 왕복은 아래의
    '좌상단 픽셀 복제 후 비교'와 같은 연산이다. 결과를 바꾸지 않으면서 resize
    두 번을 들어내 탐색 비용만 줄였다.
    """
    reference = image[::chunk, ::chunk]
    restored = np.repeat(np.repeat(reference, chunk, axis=0), chunk, axis=1)
    diff = np.abs(image.astype(np.int16) - restored.astype(np.int16))
    return int(diff.max()) <= tolerance


def detect(image: np.ndarray) -> MinChunk | None:
    """가장 큰 블록 크기부터 훑어 최소 단위 이미지를 찾는다.

    찾지 못하면 None. 블록 크기 1은 자명해라 후보에서 뺀다(원본도 element == 1
    에서 탐색을 중단한다).
    """
    height, width = image.shape[:2]
    if height < 2 or width < 2:
        return None

    divisors = [
        d for d in range(2, min(height, width) + 1)
        if height % d == 0 and width % d == 0
    ]
    for chunk in reversed(divisors):
        if _is_block_uniform(image, chunk):
            return MinChunk(chunk_size=chunk, width=width // chunk, height=height // chunk)
    return None
