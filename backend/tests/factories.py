"""테스트용 합성 이미지 생성."""

from __future__ import annotations

import numpy as np


def chunked_sprite(blocks: int, chunk: int, padding: int = 0, channels: int = 4) -> np.ndarray:
    """blocks×blocks개의 도트를 각 chunk×chunk 픽셀로 그린 온전한 픽셀 아트.

    padding을 주면 투명(또는 흰) 배경 여백이 사방에 붙는다.
    """
    content = blocks * chunk
    size = content + padding * 2
    image = np.zeros((size, size, channels), dtype=np.uint8)

    for by in range(blocks):
        for bx in range(blocks):
            colour = np.array([(bx * 37) % 256, (by * 61) % 256, ((bx + by) * 97) % 256])
            y, x = padding + by * chunk, padding + bx * chunk
            image[y : y + chunk, x : x + chunk, :3] = colour
            if channels == 4:
                image[y : y + chunk, x : x + chunk, 3] = 255
    return image
