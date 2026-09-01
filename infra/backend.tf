# 백엔드: ECR 컨테이너 이미지 + Lambda + Function URL.
#
# API Gateway를 쓰지 않는 이유는 ADR-003에 있다 — 요청당 과금을 없애기 위해서다.
# 컨테이너 이미지인 이유도 같은 문서에 있다. OpenCV와 NumPy가 ZIP 250MB 제한을
# 넘는다.

resource "aws_ecr_repository" "backend" {
  name                 = "${local.name}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  # 커밋마다 이미지가 하나씩 쌓인다. 롤백할 만큼만 남기고 지운다 — ECR은
  # 저장 용량으로 과금하므로, 두면 조용히 늘어나는 종류의 비용이다.
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "최근 10개만 남긴다"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# 처리 기록. 항목 하나에 정수 몇 개가 전부다 — 누가 올렸는지도, 어떤
# 이미지였는지도 저장하지 않는다(backend/app/stats.py). 온디맨드 과금이라
# 유휴 비용이 없고, 이 규모는 영구 무료 티어(월 2500만 요청) 안이다.
resource "aws_dynamodb_table" "stats" {
  name         = "${local.name}-stats"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # 카운터를 실수로 날리면 되돌릴 방법이 없다. 켜 두는 값이 하루 몇 센트다.
  point_in_time_recovery {
    enabled = true
  }
}

# 로그 그룹을 Lambda가 알아서 만들게 두지 않고 여기서 만든다. 자동 생성된
# 그룹은 보존 기간이 '만료 없음'이라, 개인정보 고지와 어긋나는 상태가 기본값이
# 되어 버린다.
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name}-api"
  retention_in_days = var.log_retention_days
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.name}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# AWSLambdaBasicExecutionRole 대신 직접 쓴다. 관리형 정책은 logs:CreateLogGroup을
# 모든 자원(*)에 허용하는데, 그룹은 위에서 이미 만들었으므로 함수에 필요한 것은
# 그 그룹 안에 스트림을 만들고 쓰는 권한뿐이다.
data "aws_iam_policy_document" "lambda_logs" {
  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }
}

resource "aws_iam_role_policy" "lambda_logs" {
  name   = "logs"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_logs.json
}

# 카운터 항목 하나에 대한 읽기·증가만. 스캔이나 삭제 권한은 주지 않는다 —
# 이 함수가 할 일이 아니고, 없는 권한은 오용될 수도 없다.
data "aws_iam_policy_document" "lambda_stats" {
  statement {
    actions   = ["dynamodb:UpdateItem", "dynamodb:GetItem"]
    resources = [aws_dynamodb_table.stats.arn]
  }
}

resource "aws_iam_role_policy" "lambda_stats" {
  name   = "stats"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_stats.json
}

resource "aws_lambda_function" "api" {
  function_name = "${local.name}-api"
  role          = aws_iam_role.lambda.arn

  package_type = "Image"
  image_uri    = "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"
  # Graviton이 동일 성능에서 약 20% 싸다(ADR-003). Dockerfile도 arm64로
  # 빌드하므로 여기서 어긋나면 함수가 아예 뜨지 않는다.
  architectures = ["arm64"]

  memory_size = var.lambda_memory_mb
  timeout     = var.lambda_timeout

  environment {
    variables = {
      # 원본의 allow_origins=["*"]는 쓰지 않는다. 실제 사이트 주소 하나만 연다.
      ALLOWED_ORIGINS  = local.site_origin
      MAX_UPLOAD_BYTES = tostring(var.max_upload_bytes)
      MAX_PIXELS       = tostring(var.max_pixels)
      # 비어 있으면 백엔드가 프로세스 안 카운터로 떨어진다. 배포 환경에서
      # 그렇게 되면 통계가 인스턴스마다 따로 세어져 조용히 틀린다.
      STATS_TABLE = aws_dynamodb_table.stats.name
    }
  }

  lifecycle {
    # CI가 커밋 SHA 태그로 image_uri를 갈아 끼운다. Terraform이 이것을 관리하면
    # 다음 apply가 배포된 이미지를 bootstrap 태그로 조용히 되돌린다 — 아무도
    # 손대지 않았는데 서비스가 옛 코드로 돌아가는, 알아채기 어려운 사고다.
    ignore_changes = [image_uri]
  }

  depends_on = [
    aws_iam_role_policy.lambda_logs,
    aws_iam_role_policy.lambda_stats,
  ]
}

resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"

  # CORS를 여기서 설정하지 않는다. FastAPI의 CORSMiddleware가 이미 헤더를
  # 붙이는데(app/main.py), Function URL에도 걸면 Access-Control-Allow-Origin이
  # 두 번 실려 브라우저가 오히려 요청을 막는다. 허용 오리진은 위의 환경변수
  # 하나로만 정한다.
}

# authorization_type = "NONE"만으로는 열리지 않는다. 리소스 기반 정책이 함께
# 있어야 인증 없는 호출이 허용되며, 없으면 모든 요청이 403으로 떨어진다.
#
# 콘솔에서 Function URL을 만들면 AWS가 이 권한을 자동으로 붙여 주기 때문에
# 눈에 띄지 않지만, Terraform의 aws_lambda_function_url은 붙이지 않는다.
#
# principal이 "*"인 것은 이 API가 공개 API이기 때문이다. 브라우저에서 직접
# 호출하므로 SigV4로 서명할 방법이 없다. 실제 보호는 CORS 허용 오리진과
# 업로드·화소 상한이 맡는다.
# 이 권한 하나면 된다. 콘솔은 InvokeFunction도 함께 요구한다고 안내하지만,
# 실제로 넣었다 빼 봤을 때 없어도 200이었다.
#
# 다만 **처음 만들 때 403이 한동안 이어질 수 있다.** 권한을 추가한 뒤에도 25분
# 넘게 403이 계속되다가, 정책을 한 번 더 건드리자 그때 열렸다. Lambda가 함수
# URL의 인가 판단을 캐시하고 첫 추가로는 그 캐시가 갱신되지 않은 것으로 보이나,
# 확인한 것은 "정책이 한 번 더 바뀌자 열렸다"까지이고 내부 동작은 추측이다.
#
# 그때의 증상은 정책·AuthType·함수 상태·조직 정책이 전부 정상인데 모든 요청이
# AccessDeniedException으로 떨어지는 것이다. 이 주석이 없으면 다음 사람도
# 같은 곳에서 한참 헤맨다.
resource "aws_lambda_permission" "function_url" {
  statement_id           = "AllowPublicFunctionUrlInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}
