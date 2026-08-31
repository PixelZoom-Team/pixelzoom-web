variable "project" {
  description = "자원 이름 앞에 붙는 접두사."
  type        = string
  default     = "pixelzoom"
}

variable "region" {
  description = "Lambda·ECR·S3를 둘 리전. CloudFront는 리전을 갖지 않는다."
  type        = string
  default     = "ap-northeast-2"
}

variable "domain_name" {
  description = <<-EOT
    사이트가 서비스될 도메인. 예: pixelzoom.app

    이 값이 CloudFront의 별칭이자 ACM 인증서의 대상이고, 동시에 백엔드의
    ALLOWED_ORIGINS가 된다. 셋이 어긋나면 브라우저가 요청을 막는다.
  EOT
  type        = string
}

variable "hosted_zone_name" {
  description = <<-EOT
    domain_name이 속한 Route 53 호스팅 영역의 이름. 예: pixelzoom.app

    apex 도메인을 그대로 쓰면 domain_name과 같은 값이 된다. CNAME과 달리 Route
    53의 별칭(alias) 레코드는 apex에도 놓을 수 있으므로 문제가 되지 않는다.

    이 영역은 **이미 Route 53에 있어야 한다.** Terraform이 만들지 않는 이유는,
    새로 만들면 등록기관에서 네임서버를 바꿔 끼워야 하고 그 전파를 기다리는
    동안 apply가 인증서 검증에서 멈추기 때문이다. 그 대기는 코드가 아니라
    사람이 처리할 일이다.
  EOT
  type        = string
}

variable "include_www" {
  description = <<-EOT
    www 하위 도메인을 함께 잡을지.

    사람들은 습관적으로 www를 붙여 넣는다. 잡아 두지 않으면 그 요청은 404가
    아니라 **DNS 실패**로 떨어져 '사이트가 없다'처럼 보인다. 논문 DOI에서
    연결되는 공개 데모에는 나쁜 첫인상이다.

    내용을 두 주소에서 함께 서비스하지는 않는다. CloudFront Function이 apex로
    301을 돌려주므로 정본 주소는 하나로 남는다.
  EOT
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "배포를 허용할 저장소. IAM 신뢰 정책이 이 값으로만 좁혀진다."
  type        = string
  default     = "PixelZoom-Team/pixelzoom-web"
}

variable "github_ref" {
  description = <<-EOT
    자격 증명을 내줄 git 참조. 기본값은 main 브랜치뿐이다.

    두 워크플로 모두 배포 단계에 `if: github.event_name == 'push'`가 걸려 있어
    PR에서는 자격 증명을 얻지 않는다. 그러니 여기서도 main으로 좁혀 둔다 —
    포크에서 열린 PR이 배포 역할을 집어갈 여지를 없애는 쪽이 안전하다.
  EOT
  type        = string
  default     = "refs/heads/main"
}

variable "create_oidc_provider" {
  description = <<-EOT
    GitHub OIDC 공급자를 이 스택이 만들지 여부.

    계정당 URL 하나만 존재할 수 있다. 다른 프로젝트가 이미 만들어 두었다면
    false로 두고 기존 것을 참조한다. 그대로 두면 apply가
    EntityAlreadyExists로 실패한다.
  EOT
  type        = bool
  default     = true
}

variable "image_tag" {
  description = <<-EOT
    Lambda가 처음 가리킬 이미지 태그.

    이후로는 CI가 커밋 SHA 태그로 갈아 끼우고, Terraform은 image_uri 변경을
    무시한다(lambda.tf의 lifecycle 참고). 그래서 이 값은 **첫 생성 때만**
    쓰인다.
  EOT
  type        = string
  default     = "bootstrap"
}

variable "lambda_memory_mb" {
  description = <<-EOT
    Lambda 메모리. Lambda는 메모리에 비례해 vCPU를 준다.

    2048로 잡은 것은 탐지 연산의 최대 사용량 때문이다. MAX_PIXELS(1600만)
    크기의 RGBA 이미지는 그 자체로 64MB이고, pixelzoom_core.detect가 후보
    블록마다 만드는 int16 중간 배열이 그 두 배씩 잡힌다. 1024MB로 두면
    가장 큰 입력에서 아슬아슬하다. 메모리를 올리면 vCPU도 함께 올라
    실행 시간이 줄기 때문에, GB-초로 환산한 비용은 생각만큼 늘지 않는다.
  EOT
  type        = number
  default     = 2048
}

variable "lambda_timeout" {
  description = "초. 콜드 스타트와 큰 이미지의 탐지를 합쳐도 넉넉한 값."
  type        = number
  default     = 30
}

variable "max_upload_bytes" {
  description = <<-EOT
    업로드 상한(바이트). backend/app/config.py의 기본값과 맞춰 둔다.

    Function URL의 요청 페이로드 상한이 6MB라, 그보다 낮게 잡아 게이트웨이가
    자르기 전에 우리가 413을 돌려준다.
  EOT
  type        = number
  default     = 5242880
}

variable "max_pixels" {
  description = "화소 수 상한. lambda_memory_mb의 설명과 함께 봐야 한다."
  type        = number
  default     = 16000000
}

variable "log_retention_days" {
  description = <<-EOT
    CloudWatch 로그 보존 기간.

    푸터의 개인정보 고지가 "통상적인 서버 접속 로그만 남는다"고 말한다.
    무기한 보관은 그 문장과 어긋나므로 반드시 유한한 값이어야 한다.
  EOT
  type        = number
  default     = 14
}

variable "cloudfront_price_class" {
  description = <<-EOT
    PriceClass_100은 북미·유럽뿐이라 한국 사용자가 먼 엣지로 붙는다.
    주 사용자가 한국이므로 아시아가 포함된 PriceClass_200을 기본으로 둔다.
    전송량 1TB까지는 무료 티어라 등급을 올려도 실제 청구는 대개 0이다.
  EOT
  type        = string
  default     = "PriceClass_200"
}

locals {
  name     = var.project
  www_name = "www.${var.domain_name}"

  tags = {
    Project   = var.project
    ManagedBy = "terraform"
    Repo      = var.github_repository
  }

  site_origin = "https://${var.domain_name}"
}
