from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .config import ALLOWED_ORIGINS
from .routers import analyze

app = FastAPI(title="PixelZoom API", version="0.1.0")

# 원본은 allow_origins=["*"]에 allow_credentials=True를 함께 걸었는데, 브라우저가
# 무시하는 조합인 데다 필요도 없다. 자격 증명을 쓰지 않으므로 오리진만 좁힌다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")

# Lambda 컨테이너 진입점. 로컬에서는 `uvicorn app.main:app --reload`로 띄운다.
handler = Mangum(app)
