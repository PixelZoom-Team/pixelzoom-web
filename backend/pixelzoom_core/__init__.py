"""PixelZoom 코어 알고리즘.

논문(Applied Sciences, doi:10.3390/app16052314)에 수록된 최소 단위 이미지
탐지 절차의 구현이다. 라우터/서비스 계층은 이 모듈을 참조만 하고, 알고리즘을
복사해 가지 않는다 (ADR-004).
"""

from .minchunk import MinChunk, detect
from .preprocess import background_mask, content_bbox

__all__ = ["MinChunk", "detect", "background_mask", "content_bbox"]
