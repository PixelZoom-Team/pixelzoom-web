"""코어 알고리즘 검증.

핵심은 test_matches_original_resize_roundtrip이다. 블록 균일성 판정을
numpy 복제로 바꾼 최적화가 원본의 INTER_NEAREST 왕복 비교와 정말 같은 결과를
내는지 확인한다 (ADR-004의 '검증으로 묶인 의도적 중복').
"""

from __future__ import annotations

import cv2
import numpy as np
import pytest

from pixelzoom_core.minchunk import TOLERANCE, _is_block_uniform, detect

from .factories import chunked_sprite


def original_is_block_uniform(image: np.ndarray, chunk: int) -> bool:
    """원본 dot_resizer_v3.py의 판정 방식을 그대로 옮긴 참조 구현."""
    height, width = image.shape[:2]
    shrunk = cv2.resize(
        image, (width // chunk, height // chunk), interpolation=cv2.INTER_NEAREST
    )
    restored = cv2.resize(shrunk, (width, height), interpolation=cv2.INTER_NEAREST)
    difference = cv2.absdiff(image, restored)
    _, diff = cv2.threshold(difference, TOLERANCE, 255, cv2.THRESH_BINARY)
    return np.count_nonzero(diff) == 0


@pytest.mark.parametrize("blocks,chunk", [(4, 3), (5, 4), (3, 7), (8, 2), (6, 5)])
def test_matches_original_resize_roundtrip(blocks: int, chunk: int) -> None:
    image = chunked_sprite(blocks, chunk)
    height, width = image.shape[:2]
    candidates = [d for d in range(2, min(height, width) + 1) if height % d == 0 and width % d == 0]

    for candidate in candidates:
        assert _is_block_uniform(image, candidate) == original_is_block_uniform(image, candidate), (
            f"블록 크기 {candidate}에서 최적화 구현과 원본 판정이 갈렸다"
        )


@pytest.mark.parametrize("blocks,chunk", [(4, 3), (5, 4), (3, 7), (8, 2)])
def test_detects_the_largest_chunk(blocks: int, chunk: int) -> None:
    result = detect(chunked_sprite(blocks, chunk))
    assert result is not None
    assert result.chunk_size == chunk
    assert (result.width, result.height) == (blocks, blocks)


def test_returns_none_for_noise() -> None:
    rng = np.random.default_rng(seed=0)
    noise = rng.integers(0, 256, size=(24, 24, 3), dtype=np.uint8)
    assert detect(noise) is None


def test_ignores_trivial_chunk_of_one() -> None:
    # 모든 이미지는 블록 크기 1을 만족한다. 그것을 답으로 내면 안 된다.
    rng = np.random.default_rng(seed=1)
    assert detect(rng.integers(0, 256, size=(13, 17, 3), dtype=np.uint8)) is None


def test_tolerates_differences_within_threshold() -> None:
    # 손실 압축 흔적을 흡수하는 원본의 여유(30)를 유지하는지 확인한다.
    image = chunked_sprite(4, 3, channels=3)
    image[0, 1, 0] = np.clip(int(image[0, 0, 0]) + TOLERANCE, 0, 255)
    assert detect(image) is not None
