# infra

`PixelZoom-Team/pixelzoom-web`의 AWS 자원을 만드는 Terraform입니다.
설계 근거는 저장소 밖의 ADR 문서(ADR-003, ADR-006)에 있습니다.

## 만드는 것

| 자원 | 역할 |
| --- | --- |
| ECR 리포지토리 | Lambda 컨테이너 이미지. 최근 10개만 남기고 만료 |
| Lambda (컨테이너, **ARM64**) | 판별·탐지 API. 이미지 리사이징은 하지 않는다(ADR-001) |
| Lambda Function URL | API Gateway 대신. 요청당 과금이 없다(ADR-003) |
| DynamoDB 테이블 | 누적 처리 기록. 정수 몇 개짜리 항목 하나가 전부 |
| CloudWatch 로그 그룹 | 보존 기간을 **명시적으로** 정한다 (아래 참고) |
| S3 버킷 | 정적 자산. 끝까지 비공개 |
| CloudFront + OAC | 배포. SPA 폴백과 TLS를 여기서 처리 |
| ACM 인증서 (us-east-1) | CloudFront가 붙일 수 있는 유일한 리전 |
| Route 53 레코드 | 도메인 A/AAAA 별칭과 인증서 검증 |
| CloudFront Function | `www` → apex 301. 정본 주소를 하나로 모은다 |
| Budgets 예산 (선택) | 월 한도 알림. `budget_alert_emails`를 채우면 생성 |
| GitHub OIDC 공급자 + IAM 역할 | 장기 액세스 키 없이 배포 |

## 사전 준비

1. **Route 53에 호스팅 영역이 이미 있어야 합니다.** (`pixelzoom.app` — 준비됨)
   ```bash
   aws route53 list-hosted-zones --query 'HostedZones[].Name'
   ```
   Terraform이 영역을 만들지 않는 이유는, 새로 만들면 등록기관에서 네임서버를
   바꿔 끼우고 전파를 기다려야 하는데 그동안 apply가 인증서 검증에서 멈추기
   때문입니다. 그 대기는 코드가 아니라 사람이 처리할 일입니다.

2. 도구: `terraform >= 1.6`, `aws` CLI(자격 증명 설정 완료), `docker`(buildx 포함), `gh`.

3. 변수 파일: `terraform.tfvars`는 이미 채워져 있습니다.
   ```hcl
   domain_name      = "pixelzoom.app"
   hosted_zone_name = "pixelzoom.app"
   ```

## apply — 두 번에 나눠 합니다

Lambda 컨테이너 함수는 **생성 시점에 이미지가 이미 ECR에 있어야** 합니다.
비어 있는 리포지토리를 가리키면 함수가 만들어지지 않습니다. 그래서 순서가
셋으로 갈립니다.

### 1단계 — 리포지토리만 먼저

```bash
terraform init
terraform apply -target=aws_ecr_repository.backend
```

PowerShell에서는 타깃을 **따옴표로 묶어야** 합니다. 안 그러면 인수가 쪼개져
Terraform이 `Invalid target`으로 거절합니다.

```powershell
terraform apply -target="aws_ecr_repository.backend"
```

### 2단계 — 부트스트랩 이미지 밀어 넣기

`terraform output`은 쓰지 않습니다. **`-target`을 준 apply는 출력값을 state에
쓰지 않으므로** 이 시점에는 비어 있고, 빈 리전으로 로그인을 시도하면
`Invalid endpoint: https://api.ecr..amazonaws.com`으로 실패합니다. 값은 AWS에
직접 묻습니다.

```bash
cd /f/GitHub/PixelZoom-Team/pixelzoom-web/backend

# terraform output은 쓰지 않는다. -target을 준 apply는 출력값을 state에 쓰지
# 않으므로 이 시점에는 비어 있다. 값은 AWS에 직접 묻는 편이 확실하다.
REGION=$(aws configure get region)
REPO=$(aws ecr describe-repositories --repository-names pixelzoom-backend --region "$REGION" --query 'repositories[0].repositoryUri' --output text)

echo "region=$REGION"
echo "repo=$REPO"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${REPO%%/*}"

docker buildx build --platform linux/arm64 --provenance=false -t "$REPO:bootstrap" --push .
```

빌드가 끝나면 `cd ../infra`로 돌아옵니다.
`--platform linux/arm64`가 빠지면 함수가 아예 뜨지 않습니다. Graviton을 고른
이유는 ADR-003에 있습니다.

### 3단계 — 나머지 전부

```bash
terraform apply
```

인증서 DNS 검증 때문에 몇 분 걸립니다. CloudFront 배포도 처음에는 15분쯤
잡아 두세요.

## GitHub 저장소 설정

apply가 끝나면 붙여 넣을 명령이 출력으로 나옵니다.

```bash
terraform output -raw github_setup
```

`AWS_DEPLOY_ROLE_ARN`만 Secret이고 나머지는 Variable입니다. Secret일 이유가
있어서라기보다, 역할 ARN에 계정 번호가 들어 있어 굳이 공개 로그에 남길 이유가
없기 때문입니다.

## 첫 배포

설정이 끝나면 `main`에 push하는 것만으로 두 워크플로가 돕니다.

- `backend/**`가 바뀌면 → 테스트 → ARM64 이미지 빌드·푸시 → `update-function-code`
  → `/api/health` 스모크
- `frontend/**`가 바뀌면 → 로케일 검사 → 빌드 → S3 동기화 → CloudFront 무효화

배포 후에는 실제 주소로 E2E를 다시 돌려 볼 수 있습니다.

```bash
APP_URL=https://pixelzoom.app API_URL=$(terraform output -raw api_base_url) node ../scripts/e2e.mjs
```

## 짚어 둘 결정들

**Lambda의 `image_uri`는 Terraform이 관리하지 않습니다.**
`lifecycle { ignore_changes = [image_uri] }`가 걸려 있습니다. CI가 커밋 SHA
태그로 갈아 끼우는데 Terraform이 이것까지 관리하면, 다음 apply가 배포된
이미지를 `bootstrap` 태그로 조용히 되돌립니다. 아무도 손대지 않았는데 서비스가
옛 코드로 돌아가는, 알아채기 어려운 사고입니다.

**Function URL에 CORS를 설정하지 않습니다.**
FastAPI의 `CORSMiddleware`가 이미 헤더를 붙입니다(`app/main.py`). Function
URL에도 걸면 `Access-Control-Allow-Origin`이 두 번 실려 브라우저가 오히려
요청을 막습니다. 허용 오리진은 Lambda 환경변수 `ALLOWED_ORIGINS` 하나로만
정해집니다.

**apex 도메인을 씁니다.**
`pixelzoom.app` 자체가 사이트 주소입니다. CNAME은 apex에 놓을 수 없지만 Route
53의 별칭(alias) 레코드는 놓을 수 있어 하위 도메인이 필요 없습니다.

`.app`은 HSTS preload TLD라 브라우저가 http를 시도조차 하지 않습니다. 그래도
`redirect-to-https`를 걸어 두었습니다 — 프리로드 목록을 모르는 클라이언트도
있습니다. 관리형 보안 헤더 정책으로 HSTS·`X-Content-Type-Options`·
`Referrer-Policy`도 함께 붙입니다.

**`www`는 잡되, 내용을 주지는 않습니다.**
사람들은 습관적으로 www를 붙입니다. 잡아 두지 않으면 그 요청은 404가 아니라
**DNS 실패**로 떨어져 '사이트가 없다'처럼 보입니다. 논문 DOI에서 연결되는 공개
데모에는 나쁜 첫인상입니다.

그렇다고 두 주소에서 같은 내용을 서비스하면 정본이 둘로 보입니다. 그래서
CloudFront Function이 viewer-request 단계에서 apex로 301을 돌려줍니다. 쿼리
문자열도 다시 엮어 넘깁니다 — 리다이렉트가 조용히 버리면 나중에 파라미터가
사라진 이유를 찾기 어렵습니다.

덕분에 `ALLOWED_ORIGINS`에는 apex 하나만 넣으면 됩니다. 페이지는 언제나 apex에서
뜨기 때문입니다.

**CloudFront 접근 로그를 켜지 않습니다.**
켜면 방문자 IP가 담긴 로그가 버킷에 쌓이는데, 푸터의 개인정보 고지가 말하는
범위를 넘습니다. 필요해지면 **고지를 먼저 고치고 나서** 켜야 합니다. 순서가
반대면 고지가 거짓이 됩니다.

**통계 테이블에는 숫자만 들어갑니다.**
항목 하나에 정수 몇 개가 전부입니다 — 누가 올렸는지도, 어떤 이미지였는지도
저장하지 않습니다. Lambda에 준 권한도 그 항목에 대한 `GetItem`·`UpdateItem`
둘뿐입니다. 스캔이나 삭제는 이 함수가 할 일이 아니고, 없는 권한은 오용될 수도
없습니다. 온디맨드 과금이라 유휴 비용이 없고 이 규모는 영구 무료 티어 안입니다.

**CloudWatch 보존 기간을 명시합니다(기본 14일).**
로그 그룹을 Lambda가 알아서 만들게 두면 보존이 '만료 없음'입니다. 고지와
어긋나는 상태가 기본값이 되어 버립니다.

**IAM 신뢰 정책이 저장소와 브랜치까지 좁혀져 있습니다.**
`repo:PixelZoom-Team/pixelzoom-web:ref:refs/heads/main` 하나만 이 역할을
가져갈 수 있습니다. `repo:*`처럼 두면 GitHub의 어떤 저장소든 집어갈 수 있어
OIDC를 쓰는 의미가 사라집니다.

**메모리 2048MB.** 탐지 연산의 최대 사용량 때문입니다. `MAX_PIXELS`(1600만)
크기의 RGBA 이미지는 그 자체로 64MB이고, `pixelzoom_core.detect`가 후보 블록마다
만드는 int16 중간 배열이 그 두 배씩 잡힙니다. Lambda는 메모리에 비례해 vCPU를
주므로 올리면 실행 시간이 줄어, GB-초로 환산한 비용은 생각만큼 늘지 않습니다.

## 비용

ADR-003의 계산 그대로입니다. 워크로드가 Lambda 영구 무료 티어(월 100만 요청 /
40만 GB-초)와 CloudFront 무료 티어(월 1TB) 안에 들어옵니다. 무료 티어를 넘지
않는 한 실제로 청구되는 것은 다음뿐입니다.

- Route 53 호스팅 영역 **월 $0.50**
- ECR 저장 용량 (이미지 10개 × 약 1GB → 월 $1 남짓)
- DynamoDB는 온디맨드 무료 티어(월 2500만 요청, 25GB) 안이라 사실상 $0.
  Point-in-time recovery만 데이터 크기에 비례하는데, 정수 몇 개짜리 항목
  하나라 반올림하면 0입니다.

Provisioned Concurrency는 콜드 스타트를 없애 주지만 상시 과금이라 무료 티어를
깨뜨립니다. 의도적으로 쓰지 않습니다(ADR-003).

`budget_alert_emails`에 주소를 넣으면 월 예산 알림이 함께 생깁니다. IAM
사용자별로는 나눌 수 없습니다 — 비용은 계정에 귀속되지 IAM 주체에 귀속되지
않습니다. 태그 기준(`budget_scope = "project"`)은 가능하지만 Route 53 호스팅
영역이 빠집니다. 그 영역은 이 스택이 만들지 않아 태그가 없고, 하필 이 구성에서
유일하게 확실히 청구되는 항목입니다.

## 상태 파일

지금은 로컬입니다(`terraform.tfstate`, `.gitignore` 대상). **잃어버리면 자원을
하나씩 `import`해야 합니다.** 팀원이 함께 apply하게 되면 `versions.tf`의 주석
처리된 S3 백엔드를 열고 `terraform init -migrate-state`를 한 번 돌리세요.

## 내릴 때

```bash
terraform destroy
```

S3 버킷에 객체가 남아 있으면 실패합니다. `aws s3 rm s3://<bucket> --recursive`를
먼저 돌리세요. ECR도 이미지가 있으면 막히므로 `force_delete`를 켜거나 이미지를
지워야 합니다 — 실수로 지워지는 쪽보다 막히는 쪽이 낫다고 보고 켜 두지
않았습니다.
