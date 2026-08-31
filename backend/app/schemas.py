"""API 응답 스키마.

프론트엔드가 그대로 쓰도록 JSON은 camelCase로 직렬화한다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


def _to_camel(name: str) -> str:
    head, *tail = name.split("_")
    return head + "".join(word.capitalize() for word in tail)


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)


class Size(_Camel):
    width: int
    height: int


class BBox(_Camel):
    x: int
    y: int
    width: int
    height: int


class Detection(_Camel):
    """한 가지 탐지 시도의 결과."""

    detected: bool
    source: Size
    """탐지를 시도한 영역의 크기. 프론트는 이 크기에 배율을 곱해야 한다."""
    chunk_size: int | None = None
    minchunk: Size | None = None
    bbox: BBox | None = None
    """크롭 기준 시도일 때 원본 안에서의 위치. 원본 기준 시도에서는 null."""


class AnalyzeResponse(_Camel):
    """3단계 폴백(ADR-002)에 필요한 모든 정보를 한 번에 담는다.

    왕복을 두 번으로 늘리면 서버리스 콜드 스타트를 두 번 겪게 되므로,
    '원본 기준'과 '크롭 기준' 결과를 함께 반환하고 분기는 클라이언트가 한다.
    """

    image: Size
    as_is: Detection
    cropped: Detection


class StatsResponse(_Camel):
    """서비스 개시 이래의 누적 처리 기록.

    숫자뿐이다. 어떤 이미지였는지, 누가 올렸는지는 저장하지 않는다.
    """

    images: int
    """분석한 이미지 수."""
    users: int
    """이미지를 한 번이라도 올린 브라우저 수. 정확한 사람 수는 아니다."""
    lossless: int
    """원본 그대로 블록을 찾은 이미지."""
    croppable: int
    """배경을 잘라야 블록을 찾을 수 있는 이미지."""
    unsupported: int
    """잘라도 온전한 픽셀 아트가 아닌 이미지."""
