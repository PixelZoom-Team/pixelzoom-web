from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile

from .. import stats
from ..config import MAX_PIXELS, MAX_UPLOAD_BYTES
from ..schemas import AnalyzeResponse, StatsResponse
from ..services import ImageDecodeError, analyze, decode

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(
    image: UploadFile = File(...),
    first_use: bool = Form(False),
) -> AnalyzeResponse:
    """이미지 한 장을 분석한다.

    `first_use`는 '이 브라우저가 처음 올린다'는 한 비트다. 사용자 수를 세는 데
    쓰이며, 서버가 사람을 구분하는 데는 쓸 수 없다 — 식별자가 아니라 참/거짓
    하나이기 때문이다. 자세한 것은 app/stats.py에 적어 두었다.
    """
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"이미지는 {MAX_UPLOAD_BYTES // (1024 * 1024)}MB 이하여야 합니다.",
        )

    try:
        decoded = decode(data)
    except ImageDecodeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    height, width = decoded.shape[:2]
    if width * height > MAX_PIXELS:
        raise HTTPException(
            status_code=413,
            detail=f"이미지 화소 수가 상한({MAX_PIXELS:,})을 넘습니다.",
        )

    result = analyze(decoded)

    # 분석에 성공한 것만 센다. 읽지도 못한 파일을 '처리한 이미지'로 세면
    # 통계 화면의 숫자가 실제로 리사이징된 것보다 커진다.
    stats.record(
        stats.classify(result.as_is.detected, result.cropped.detected),
        first_use=first_use,
    )
    return result


@router.get("/stats", response_model=StatsResponse)
async def read_stats(response: Response) -> StatsResponse:
    # 푸터가 모든 페이지에서 이 값을 읽는다. 잠깐이라도 캐시해 두면 같은 사람이
    # 페이지를 옮겨 다닐 때마다 Lambda를 다시 깨우지 않는다.
    response.headers["Cache-Control"] = "public, max-age=60"
    return StatsResponse(**stats.totals())


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
