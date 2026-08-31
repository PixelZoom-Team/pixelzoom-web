"""처리 기록 검증.

이 숫자는 화면에 "서비스 개시 이래 n개를 처리했습니다"로 나가고, 통계 페이지가
세 갈래 비율을 보여준다. 잘못 세면 사용자에게 틀린 사실을 말하게 되므로,
갈래 판정과 증가 규칙을 여기서 못 박는다.

기록이 실패했을 때 요청까지 같이 죽지 않는지도 함께 본다 — 숫자를 세는 일이
리사이징을 막을 이유는 없다.
"""

from __future__ import annotations

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import stats
from app.main import app

from .factories import chunked_sprite


@pytest.fixture(autouse=True)
def fresh_counters():
    """테스트마다 카운터를 비운다. 모듈 전역 싱글턴이라 새지 않게 막는다."""
    stats._recorder = stats.MemoryRecorder()
    yield
    stats._recorder = None


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def encode_png(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()


def post_image(client: TestClient, payload: bytes, **data):
    return client.post(
        "/api/analyze",
        files={"image": ("sprite.png", payload, "image/png")},
        data=data,
    )


def test_classify_covers_three_branches() -> None:
    assert stats.classify(True, True) == stats.LOSSLESS
    assert stats.classify(True, False) == stats.LOSSLESS
    assert stats.classify(False, True) == stats.CROPPABLE
    assert stats.classify(False, False) == stats.UNSUPPORTED


def test_memory_recorder_counts_image_and_category() -> None:
    recorder = stats.MemoryRecorder()
    recorder.record(stats.LOSSLESS, first_use=False)
    recorder.record(stats.CROPPABLE, first_use=False)

    totals = recorder.totals()
    assert totals["images"] == 2
    assert totals["lossless"] == 1
    assert totals["croppable"] == 1
    assert totals["unsupported"] == 0
    assert totals["users"] == 0


def test_first_use_flag_counts_a_user() -> None:
    recorder = stats.MemoryRecorder()
    recorder.record(stats.LOSSLESS, first_use=True)
    recorder.record(stats.LOSSLESS, first_use=False)

    totals = recorder.totals()
    assert totals["images"] == 2
    # 사용자 수는 '처음'이라고 알려 준 횟수만큼만 오른다.
    assert totals["users"] == 1


def test_analyze_records_a_lossless_image(client: TestClient) -> None:
    assert post_image(client, encode_png(chunked_sprite(4, 3))).status_code == 200

    totals = client.get("/api/stats").json()
    assert totals["images"] == 1
    assert totals["lossless"] == 1
    assert totals["croppable"] == 0
    assert totals["unsupported"] == 0


def test_analyze_records_a_croppable_image(client: TestClient) -> None:
    # 여백이 붙으면 원본 기준으로는 못 찾고 크롭 기준으로는 찾는다.
    padded = chunked_sprite(4, 3, padding=5)
    assert post_image(client, encode_png(padded)).status_code == 200

    totals = client.get("/api/stats").json()
    assert totals["croppable"] == 1
    assert totals["lossless"] == 0


def test_analyze_passes_first_use_through(client: TestClient) -> None:
    post_image(client, encode_png(chunked_sprite(4, 3)), first_use="true")
    post_image(client, encode_png(chunked_sprite(4, 3)))

    totals = client.get("/api/stats").json()
    assert totals["images"] == 2
    assert totals["users"] == 1


def test_rejected_uploads_are_not_counted(client: TestClient) -> None:
    """읽지도 못한 파일을 '처리한 이미지'로 세면 숫자가 부풀려진다."""
    assert post_image(client, b"not a png").status_code == 400
    assert client.get("/api/stats").json()["images"] == 0


def test_recording_failure_does_not_break_the_request(client: TestClient) -> None:
    class Broken:
        def record(self, category: str, first_use: bool) -> None:
            raise RuntimeError("테이블이 없다")

        def totals(self) -> dict[str, int]:
            raise RuntimeError("테이블이 없다")

    stats._recorder = Broken()

    assert post_image(client, encode_png(chunked_sprite(4, 3))).status_code == 200
    # 읽기가 실패해도 화면이 깨지지 않도록 0으로 채운 값을 준다.
    assert client.get("/api/stats").json()["images"] == 0


def test_stats_response_is_cacheable(client: TestClient) -> None:
    """푸터가 모든 페이지에서 읽으므로, 캐시 헤더가 빠지면 Lambda를 매번 깨운다."""
    assert "max-age" in client.get("/api/stats").headers["cache-control"]
