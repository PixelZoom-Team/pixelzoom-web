# ARM64(Graviton)는 동일 성능에서 약 20% 저렴하다 (ADR-003).
# 파이썬 버전은 개발 환경과 맞춘다. 런타임이 다르면 로컬에서 통과한 조합이
# 이미지 안에서 그대로 재현된다는 보장이 없다.
FROM public.ecr.aws/lambda/python:3.13-arm64

# OpenCV가 런타임에 libgomp을 찾는다. headless 빌드라 GUI 의존성은 필요 없다.
RUN dnf install -y libgomp && dnf clean all

COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

COPY pixelzoom_core ${LAMBDA_TASK_ROOT}/pixelzoom_core
COPY app ${LAMBDA_TASK_ROOT}/app

CMD ["app.main.handler"]
