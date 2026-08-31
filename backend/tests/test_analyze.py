"""서비스 계층 검증 — 3단계 폴백(ADR-002)에 필요한 분기가 다 나오는지."""

from __future__ import annotations

import cv2
import numpy as np
import pytest

from app.services import ImageDecodeError, analyze, decode

from .factories import chunked_sprite


def test_step_one_detects_without_cropping() -> None:
    """여백이 없으면 원본 그대로 탐지된다 → 사용자 이미지를 건드리지 않는다."""
    result = analyze(chunked_sprite(4, 3))
    assert result.as_is.detected
    assert result.as_is.chunk_size == 3
    assert result.as_is.bbox is None


def test_step_two_requires_cropping() -> None:
    """여백 때문에 원본 탐지는 실패하고, 크롭 기준으로는 성공한다."""
    result = analyze(chunked_sprite(4, 3, padding=2))
    assert not result.as_is.detected
    assert result.cropped.detected
    assert result.cropped.chunk_size == 3
    assert result.cropped.bbox is not None
    assert (result.cropped.bbox.x, result.cropped.bbox.y) == (2, 2)
    assert (result.cropped.source.width, result.cropped.source.height) == (12, 12)


def test_step_three_both_fail() -> None:
    """어느 쪽으로도 못 찾으면 클라이언트는 NN 폴백으로 간다."""
    rng = np.random.default_rng(seed=2)
    noisy = rng.integers(0, 256, size=(29, 31, 3), dtype=np.uint8)
    result = analyze(noisy)
    assert not result.as_is.detected
    assert not result.cropped.detected


def test_reports_full_image_size_not_cropped_size() -> None:
    """프론트가 배율을 곱할 기준을 헷갈리지 않도록 두 크기를 모두 준다."""
    result = analyze(chunked_sprite(4, 3, padding=2))
    assert (result.image.width, result.image.height) == (16, 16)
    assert (result.as_is.source.width, result.as_is.source.height) == (16, 16)


def test_decode_rejects_garbage() -> None:
    with pytest.raises(ImageDecodeError):
        decode(b"this is not an image")


def test_decode_roundtrips_png() -> None:
    sprite = chunked_sprite(4, 3)
    ok, buffer = cv2.imencode(".png", sprite)
    assert ok
    assert decode(buffer.tobytes()).shape == sprite.shape
