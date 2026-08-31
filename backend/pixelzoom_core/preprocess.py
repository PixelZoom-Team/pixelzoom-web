"""배경 마스크 생성과 내용물 경계 추출.

원본 `dot_resizer_v3.py`의 preprocess_image / extract_content에 대응한다.
"""

from __future__ import annotations

import cv2
import numpy as np

BBox = tuple[int, int, int, int]


def background_mask(image: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """배경을 제외한 영역의 마스크와, 알파를 뗀 BGR 이미지를 돌려준다.

    알파 채널에 투명한 영역이 있으면 그것을 배경으로 보고, 그렇지 않으면
    240 이상의 밝은 픽셀을 흰 배경으로 간주한다. 원본과 동일한 기준이다.
    """
    if image.ndim == 3 and image.shape[2] == 4:
        alpha = image[:, :, 3]
        bgr = image[:, :, :3]
        if np.all(alpha == 255):
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
        else:
            _, mask = cv2.threshold(alpha, 0, 255, cv2.THRESH_BINARY)
    else:
        bgr = image if image.ndim == 3 else cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    return bgr, mask


def content_bbox(mask: np.ndarray) -> BBox | None:
    """마스크의 비영 픽셀 전체를 감싸는 경계 상자.

    원본은 findContours 후 contours[0]을 썼으나 이는 '가장 큰' 외곽선이 아니라
    '첫 번째' 외곽선이다. 눈·장식처럼 몸통과 떨어진 조각이 있는 스프라이트에서
    내용물의 일부만 잡히는 결함이라, 마스크 전체 기준으로 교체했다.
    """
    x, y, w, h = cv2.boundingRect(mask)
    if w == 0 or h == 0:
        return None
    return int(x), int(y), int(w), int(h)
