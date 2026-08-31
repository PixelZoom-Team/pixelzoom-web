"""처리 기록을 센다.

**세는 것은 숫자뿐이다.** 누가 올렸는지, 어떤 이미지였는지는 아무것도 남기지
않는다. 식별자도 저장하지 않는다 — 저장할 것이 애초에 없다. 항목 하나에 정수
몇 개가 전부이고, DynamoDB의 원자적 ADD로 올린다.

'사용자 수'는 **이미지를 한 번이라도 올린 브라우저의 수**다. 브라우저가
'처음 올리는 것'이라고 알려 줄 때만 1을 더한다. 그 신호는 참/거짓 한 비트라
서버가 사람을 구분하는 데 쓸 수 없다. 대신 저장소를 비우거나 다른 브라우저로
오면 다시 세어지므로, 이 값은 실제 사람 수보다 크거나 작을 수 있다. 통계
페이지에 그렇게 적어 둔다 — 정확한 척하는 것보다 낫다.

기록에 실패해도 요청은 성공해야 한다. 숫자를 세는 일이 리사이징을 막을 이유는
없다.
"""

from __future__ import annotations

import logging
import threading
from typing import Protocol

from .config import STATS_TABLE

logger = logging.getLogger(__name__)

#: 이미지 한 장이 떨어지는 갈래. 프론트의 3단계 폴백(ADR-002)과 같은 구분이다.
LOSSLESS = "lossless"        # 원본 그대로 블록을 찾았다
CROPPABLE = "croppable"      # 배경을 잘라야 찾을 수 있다
UNSUPPORTED = "unsupported"  # 잘라도 온전한 픽셀 아트가 아니다

CATEGORIES = (LOSSLESS, CROPPABLE, UNSUPPORTED)
COUNTERS = ("images", "users", *CATEGORIES)

ITEM_KEY = "totals"


class Recorder(Protocol):
    def record(self, category: str, first_use: bool) -> None: ...
    def totals(self) -> dict[str, int]: ...


class MemoryRecorder:
    """테이블이 지정되지 않았을 때 쓰는 프로세스 안 카운터.

    로컬 개발과 테스트를 위한 것이다. 프로세스가 죽으면 사라지므로 배포
    환경에서 이것이 선택됐다면 설정이 빠진 것이다.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._counts = dict.fromkeys(COUNTERS, 0)

    def record(self, category: str, first_use: bool) -> None:
        with self._lock:
            self._counts["images"] += 1
            if category in CATEGORIES:
                self._counts[category] += 1
            if first_use:
                self._counts["users"] += 1

    def totals(self) -> dict[str, int]:
        with self._lock:
            return dict(self._counts)


class DynamoRecorder:
    """항목 하나에 원자적 ADD.

    읽고-더하고-쓰기를 하지 않는 이유는 동시 요청 때문이다. Lambda는 같은
    순간에 여러 인스턴스가 뜨므로, 읽어서 더하면 그 사이의 증가분이 조용히
    사라진다. ADD는 서버 쪽에서 원자적으로 처리된다.
    """

    def __init__(self, table_name: str) -> None:
        import boto3  # 지연 임포트 — 메모리 구현만 쓰는 환경에 부담을 주지 않는다

        self._table = boto3.resource("dynamodb").Table(table_name)

    def record(self, category: str, first_use: bool) -> None:
        increments = {"images": 1}
        if category in CATEGORIES:
            increments[category] = 1
        if first_use:
            increments["users"] = 1

        # ADD는 속성이 없으면 0에서 시작한다. 항목을 미리 만들어 둘 필요가 없다.
        expression = "ADD " + ", ".join(f"#{name} :{name}" for name in increments)
        self._table.update_item(
            Key={"id": ITEM_KEY},
            UpdateExpression=expression,
            ExpressionAttributeNames={f"#{name}": name for name in increments},
            ExpressionAttributeValues={f":{name}": value for name, value in increments.items()},
        )

    def totals(self) -> dict[str, int]:
        # 강한 일관성을 쓰지 않는다. 통계 화면의 숫자가 몇 초 늦는 것은 문제가
        # 아니고, 읽기 비용은 절반이다.
        item = self._table.get_item(Key={"id": ITEM_KEY}).get("Item", {})
        return {name: int(item.get(name, 0)) for name in COUNTERS}


def _build() -> Recorder:
    if STATS_TABLE:
        return DynamoRecorder(STATS_TABLE)
    logger.info("STATS_TABLE이 없어 메모리 카운터를 씁니다 (로컬/테스트).")
    return MemoryRecorder()


_recorder: Recorder | None = None


def recorder() -> Recorder:
    global _recorder
    if _recorder is None:
        _recorder = _build()
    return _recorder


def classify(as_is_detected: bool, cropped_detected: bool) -> str:
    """분석 결과를 세 갈래 중 하나로."""
    if as_is_detected:
        return LOSSLESS
    if cropped_detected:
        return CROPPABLE
    return UNSUPPORTED


def record(category: str, first_use: bool = False) -> None:
    """세다가 실패해도 요청은 살린다."""
    try:
        recorder().record(category, first_use)
    except Exception:  # noqa: BLE001 — 무엇이 터지든 사용자 요청보다 덜 중요하다
        logger.exception("처리 기록에 실패했습니다")


def totals() -> dict[str, int]:
    """읽기에 실패하면 0으로 채운 값을 준다. 화면이 깨지는 것보다 낫다."""
    try:
        return recorder().totals()
    except Exception:  # noqa: BLE001
        logger.exception("처리 기록을 읽지 못했습니다")
        return dict.fromkeys(COUNTERS, 0)
