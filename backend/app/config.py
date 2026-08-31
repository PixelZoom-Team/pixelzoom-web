"""환경 변수 기반 설정.

원본 config.py는 import 시점에 업로드 디렉토리를 만들었는데, Lambda의
`/var/task`는 읽기 전용이라 그대로 두면 콜드 스타트에서 죽는다. 애초에 임시
파일을 쓰지 않도록 바꿨으므로(app/services/analyzer.py 참고) 디렉토리 설정
자체가 사라졌다.
"""

from __future__ import annotations

import os

# Lambda Function URL의 요청 페이로드 상한이 6MB다. multipart 오버헤드를 감안해
# 그보다 낮게 잡아, 게이트웨이가 자르기 전에 우리가 명확한 413을 돌려준다.
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 5 * 1024 * 1024))

# 블록 탐색은 이미지 크기에 비례한다. 무료 티어를 지키려면 상한이 필요하다.
MAX_PIXELS = int(os.getenv("MAX_PIXELS", 16_000_000))

# 쉼표로 구분된 허용 오리진. 기본값은 로컬 개발용이며, 배포 시 Terraform이
# CloudFront 도메인을 주입한다. 원본의 allow_origins=["*"]는 쓰지 않는다.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

# 처리 기록을 담을 DynamoDB 테이블. 비어 있으면 프로세스 안 카운터를 쓴다
# (app/stats.py 참고). 로컬 개발과 테스트가 AWS 없이 돌아가기 위한 것이며,
# 배포 환경에서 비어 있다면 설정이 빠진 것이다.
STATS_TABLE = os.getenv("STATS_TABLE", "")
