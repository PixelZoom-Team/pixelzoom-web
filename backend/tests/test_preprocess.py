"""내용물 경계 추출 검증.

원본과의 전수 비교(샘플 61장)에서 유일하게 갈렸던 지점을 고정한다. 원본은
findContours의 contours[0]을 썼는데 이는 '가장 큰' 외곽선이 아니라 '첫 번째'
외곽선이다. 실제로 2066x1494 샘플에서 우하단의 6x4 티끌이 선택되어, 사진에
불과한 이미지에서 블록 크기 2가 '탐지'됐다.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.services import analyze
from pixelzoom_core import background_mask, content_bbox


def image_with_detached_speck() -> np.ndarray:
    """큰 본체와, 그것과 떨어진 작은 티끌이 함께 있는 이미지."""
    canvas = np.zeros((80, 80, 4), dtype=np.uint8)
    canvas[10:50, 10:50, :3] = 200
    canvas[10:50, 10:50, 3] = 255
    canvas[74:78, 74:78, :3] = 120  # 본체에서 떨어진 티끌
    canvas[74:78, 74:78, 3] = 255
    return canvas


def test_bbox_covers_every_contour_not_just_the_first() -> None:
    image = image_with_detached_speck()
    _, mask = background_mask(image)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    assert len(contours) > 1, "이 표본은 외곽선이 둘 이상이어야 의미가 있다"

    bbox = content_bbox(mask)
    assert bbox is not None
    x, y, width, height = bbox
    # 본체(10,10)부터 티끌 끝(78,78)까지 전부 감싸야 한다.
    assert (x, y) == (10, 10)
    assert (x + width, y + height) == (78, 78)

    first = cv2.boundingRect(contours[0])
    assert first != bbox, "원본이 고르던 contours[0]과 다르다는 점이 이 수정의 핵심"


def test_empty_mask_yields_no_bbox() -> None:
    assert content_bbox(np.zeros((20, 20), dtype=np.uint8)) is None


def test_blank_image_does_not_crash_analyze() -> None:
    """잘라낼 내용물이 없어도 크롭 시도는 원본 전체로 안전하게 물러난다."""
    blank = np.full((16, 16, 3), 255, dtype=np.uint8)
    result = analyze(blank)
    assert result.cropped.bbox is not None
    assert (result.cropped.bbox.width, result.cropped.bbox.height) == (16, 16)
