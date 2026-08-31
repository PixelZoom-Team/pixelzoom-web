"""Lambda 진입점 검증.

로컬에서는 uvicorn이 ASGI 앱을 직접 서빙하므로 `app.main.handler`(Mangum)는
한 번도 실행되지 않는다. 즉 배포 경로만 검증 공백으로 남는다. 실제 Lambda
Function URL이 보내는 모양의 이벤트를 만들어 그 공백을 메운다.

이 테스트가 잡아주는 것은 어댑터 계층이지 런타임 환경이 아니다. ARM64 이미지
빌드와 OpenCV의 네이티브 의존성은 여전히 실제 도커 빌드로만 확인된다.
"""

from __future__ import annotations

import base64
import json

import cv2
import pytest

from app.main import handler

from .factories import chunked_sprite

BOUNDARY = "----pixelzoomboundary"


class FakeLambdaContext:
    """Mangum이 스코프에 실어 나르는 컨텍스트의 최소 형태."""

    function_name = "pixelzoom-analyze"
    memory_limit_in_mb = 1024
    invoked_function_arn = "arn:aws:lambda:ap-northeast-2:000000000000:function:pixelzoom-analyze"
    aws_request_id = "00000000-0000-4000-8000-000000000000"

    def get_remaining_time_in_millis(self) -> int:
        return 30_000


def multipart_body(payload: bytes, filename: str = "sprite.png") -> bytes:
    head = (
        f"--{BOUNDARY}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode()
    return head + payload + f"\r\n--{BOUNDARY}--\r\n".encode()


def function_url_event(body: bytes, method: str = "POST", path: str = "/api/analyze") -> dict:
    """Lambda Function URL의 payload format 2.0."""
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {
            "content-type": f"multipart/form-data; boundary={BOUNDARY}",
            "content-length": str(len(body)),
            "host": "example.lambda-url.ap-northeast-2.on.aws",
        },
        "requestContext": {
            "accountId": "anonymous",
            "apiId": "example",
            "domainName": "example.lambda-url.ap-northeast-2.on.aws",
            "domainPrefix": "example",
            "http": {
                "method": method,
                "path": path,
                "protocol": "HTTP/1.1",
                "sourceIp": "203.0.113.1",
                "userAgent": "pytest",
            },
            "requestId": "00000000-0000-4000-8000-000000000000",
            "routeKey": "$default",
            "stage": "$default",
            "time": "01/Sep/2026:00:00:00 +0000",
            "timeEpoch": 1_788_000_000_000,
        },
        # Function URL은 바이너리 본문을 base64로 실어 보낸다. 이 플래그를 잘못
        # 다루면 이미지가 통째로 깨지는데, 로컬 uvicorn으로는 절대 드러나지 않는다.
        "body": base64.b64encode(body).decode(),
        "isBase64Encoded": True,
    }


@pytest.fixture(scope="module")
def sprite_png() -> bytes:
    ok, buffer = cv2.imencode(".png", chunked_sprite(4, 3))
    assert ok
    return buffer.tobytes()


def test_handler_analyzes_a_base64_multipart_upload(sprite_png: bytes) -> None:
    response = handler(function_url_event(multipart_body(sprite_png)), FakeLambdaContext())

    assert response["statusCode"] == 200
    payload = json.loads(response["body"])
    assert payload["asIs"]["detected"] is True
    assert payload["asIs"]["chunkSize"] == 3
    assert payload["asIs"]["minchunk"] == {"width": 4, "height": 4}


def test_handler_serves_health_check() -> None:
    event = function_url_event(b"", method="GET", path="/api/health")
    event["headers"].pop("content-type")
    event["body"] = None
    event["isBase64Encoded"] = False

    response = handler(event, FakeLambdaContext())
    assert response["statusCode"] == 200
    assert json.loads(response["body"]) == {"status": "ok"}


def test_handler_reports_errors_rather_than_raising() -> None:
    """어댑터가 예외를 던지면 Lambda는 502를 내고 본문을 잃는다."""
    response = handler(function_url_event(multipart_body(b"not a png")), FakeLambdaContext())
    assert response["statusCode"] == 400
    assert "detail" in json.loads(response["body"])


def test_handler_survives_an_unknown_route() -> None:
    event = function_url_event(b"", method="GET", path="/nope")
    event["headers"].pop("content-type")
    event["body"] = None
    event["isBase64Encoded"] = False

    assert handler(event, FakeLambdaContext())["statusCode"] == 404
