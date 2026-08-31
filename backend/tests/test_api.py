"""HTTP 계층 검증.

프론트엔드가 의존하는 것은 서비스 함수가 아니라 JSON의 모양이다. 필드 이름이
camelCase로 나가는지, 상한을 넘긴 요청이 제대로 거절되는지를 여기서 못 박는다.
"""

from __future__ import annotations

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app

from .factories import chunked_sprite


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def encode_png(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()


def post_image(client: TestClient, payload: bytes, name: str = "sprite.png"):
    return client.post("/api/analyze", files={"image": (name, payload, "image/png")})


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_returns_camel_case_payload(client: TestClient) -> None:
    response = post_image(client, encode_png(chunked_sprite(4, 3)))
    assert response.status_code == 200

    body = response.json()
    assert set(body) == {"image", "asIs", "cropped"}
    assert body["asIs"]["detected"] is True
    assert body["asIs"]["chunkSize"] == 3
    assert body["asIs"]["minchunk"] == {"width": 4, "height": 4}
    assert body["asIs"]["source"] == {"width": 12, "height": 12}
    assert body["asIs"]["bbox"] is None


def test_crop_branch_exposes_bbox(client: TestClient) -> None:
    body = post_image(client, encode_png(chunked_sprite(4, 3, padding=2))).json()
    assert body["asIs"]["detected"] is False
    assert body["cropped"]["detected"] is True
    assert body["cropped"]["bbox"] == {"x": 2, "y": 2, "width": 12, "height": 12}


def test_rejects_non_image(client: TestClient) -> None:
    assert post_image(client, b"not an image at all").status_code == 400


def test_rejects_empty_file(client: TestClient) -> None:
    assert post_image(client, b"").status_code == 400


def test_rejects_oversized_upload(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.routers.analyze.MAX_UPLOAD_BYTES", 128)
    assert post_image(client, encode_png(chunked_sprite(8, 4))).status_code == 413


def test_rejects_too_many_pixels(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.routers.analyze.MAX_PIXELS", 16)
    assert post_image(client, encode_png(chunked_sprite(4, 3))).status_code == 413


def test_filename_is_never_used_as_a_path(client: TestClient) -> None:
    # 원본은 업로드 파일명을 그대로 경로에 붙여 디스크에 썼다. 이제 파일명은
    # 어디에도 쓰이지 않으므로 경로 탈출을 시도해도 정상 처리된다.
    response = post_image(client, encode_png(chunked_sprite(4, 3)), name="../../../etc/passwd")
    assert response.status_code == 200
    assert response.json()["asIs"]["chunkSize"] == 3
