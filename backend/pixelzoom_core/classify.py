"""픽셀 아트 여부 판별 (원본 `PixelZoom.py`의 detect_aliased_edges 대응).

MVP API에서는 호출하지 않는다. 일반 이미지 경로를 의도적으로 유예했기
때문이다(ADR-005). 그 경로를 되살릴 때 바로 쓰도록 코어에 함께 둔다.
"""

from __future__ import annotations

import cv2
import numpy as np

# 원본 기준: 엣지로 잡힌 픽셀 중 계단 현상이 아닌 비율이 절반 미만이면 픽셀 아트.
NOISE_THRESHOLD = 0.5


def aliased_ratio(image: np.ndarray) -> float | None:
    """엣지 픽셀 대비 '계단 현상이 아닌' 픽셀의 비율(노이즈 레벨)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image

    grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = np.sqrt(grad_x**2 + grad_y**2)
    angle = np.arctan2(grad_y, grad_x) * 180 / np.pi

    aliased = (magnitude > 100) & ((angle % 45) < 10)
    total_edges = int(np.sum(magnitude > 100))
    if total_edges == 0:
        return None
    return (total_edges - int(np.sum(aliased))) / total_edges


def is_pixel_art(image: np.ndarray) -> bool:
    noise = aliased_ratio(image)
    return noise is not None and noise < NOISE_THRESHOLD
