"""업로드된 이미지를 두 기준(원본/크롭)으로 분석한다."""

from __future__ import annotations

import cv2
import numpy as np

from pixelzoom_core import background_mask, content_bbox, detect
from .schemas import AnalyzeResponse, BBox, Detection, Size


class ImageDecodeError(ValueError):
    """지원하지 않는 형식이거나 손상된 이미지."""


def decode(data: bytes) -> np.ndarray:
    """바이트를 곧바로 디코딩한다.

    원본은 업로드 파일명을 그대로 경로에 붙여 디스크에 썼다. 경로 탈출이
    가능했고, 같은 이름의 동시 요청이 서로의 파일을 덮어썼다. 임시 파일을 아예
    쓰지 않으면 두 결함이 함께 사라지고, Lambda의 읽기 전용 파일시스템 문제도
    같이 없어진다.
    """
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ImageDecodeError("이미지를 해석할 수 없습니다.")
    return image


def _to_detection(region: np.ndarray, bbox: tuple[int, int, int, int] | None) -> Detection:
    height, width = region.shape[:2]
    found = detect(region)
    return Detection(
        detected=found is not None,
        source=Size(width=width, height=height),
        chunk_size=found.chunk_size if found else None,
        minchunk=Size(width=found.width, height=found.height) if found else None,
        bbox=BBox(x=bbox[0], y=bbox[1], width=bbox[2], height=bbox[3]) if bbox else None,
    )


def analyze(image: np.ndarray) -> AnalyzeResponse:
    """원본 그대로와 배경 크롭 후, 두 가지 탐지를 모두 수행한다.

    3단계 폴백(ADR-002)에서 클라이언트가 어느 단계로 갈지 결정하는 데 필요한
    정보를 한 번의 왕복으로 모두 넘기기 위함이다.
    """
    height, width = image.shape[:2]

    _, mask = background_mask(image)
    bbox = content_bbox(mask)
    if bbox is None:
        # 배경 마스크가 비었다 = 잘라낼 것이 없다. 크롭 시도는 원본과 같아진다.
        bbox = (0, 0, width, height)
    x, y, w, h = bbox

    return AnalyzeResponse(
        image=Size(width=width, height=height),
        as_is=_to_detection(image, None),
        cropped=_to_detection(image[y : y + h, x : x + w], bbox),
    )
