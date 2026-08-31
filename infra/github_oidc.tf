# GitHub Actions가 OIDC로 AWS에 인증한다. 장기 액세스 키를 만들지 않는 것이
# 목적이다 — 키는 저장소에 넣는 순간 유출 경로가 되고, 회수 시점을 사람이
# 기억해야 하는 종류의 자산이 된다.

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # AWS는 2023년 이후 이 값을 실제로 검증하지 않고 TLS 체인을 직접 확인한다.
  # 그래도 API가 값을 요구하므로 알려진 지문을 넣어 둔다.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

locals {
  repo_owner = split("/", var.github_repository)[0]
  repo_name  = split("/", var.github_repository)[1]

  # GitHub이 sub에 불변 ID를 넣는 형식을 쓰는지에 따라 갈린다.
  #
  # **저장소 ID는 와일드카드로 둔다.** 저장소를 지웠다 다시 만들면 ID가
  # 바뀌는데, 그때 나오는 오류가 "Not authorized to perform
  # sts:AssumeRoleWithWebIdentity" 하나뿐이라 원인을 찾기가 매우 어렵다.
  # 조직 ID는 그대로 박아 두므로, 다른 조직이 같은 이름으로 흉내 내는 것은
  # 여전히 막힌다. 같은 조직 안에서 저장소를 다시 만들 수 있는 사람은
  # 어차피 이 역할도 고칠 수 있는 관리자다.
  github_subject = var.github_owner_id == "" ? (
    "repo:${var.github_repository}:ref:${var.github_ref}"
    ) : (
    "repo:${local.repo_owner}@${var.github_owner_id}/${local.repo_name}@*:ref:${var.github_ref}"
  )

  github_subject_test = var.github_owner_id == "" ? "StringEquals" : "StringLike"
}
data "aws_iam_policy_document" "deploy_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # sub를 저장소와 브랜치까지 좁힌다. `repo:*`처럼 두면 GitHub의 어떤
    # 저장소든 이 역할을 집어갈 수 있다 — OIDC를 쓰는 의미가 사라진다.
    condition {
      test     = local.github_subject_test
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_subject]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name = "${local.name}-github-deploy"

  # IAM의 description은 ASCII와 Latin-1 범위만 받는다. 한글을 넣으면
  # CreateRole이 ValidationError로 거절한다. 이 저장소의 다른 설명은 한국어지만
  # 여기만은 영어여야 한다 — ECR과 CloudFront는 UTF-8을 받아 주기 때문에
  # 헷갈리기 쉬운 지점이다.
  description = "GitHub Actions deploy role. Assumable only from ${var.github_repository} at ${var.github_ref}."

  assume_role_policy = data.aws_iam_policy_document.deploy_assume.json
}

data "aws_iam_policy_document" "deploy" {
  # ECR 로그인 토큰은 자원을 지정할 수 없는 호출이다.
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid       = "EcrPush"
    resources = [aws_ecr_repository.backend.arn]
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
  }

  # 워크플로는 update-function-code 뒤에 wait function-updated를 부른다.
  # 그 대기가 GetFunctionConfiguration을 폴링하므로 함께 열어 둔다.
  statement {
    sid       = "LambdaDeploy"
    resources = [aws_lambda_function.api.arn]
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
    ]
  }

  # `aws s3 sync --delete`는 목록 조회와 삭제까지 필요하다.
  statement {
    sid       = "SiteList"
    resources = [aws_s3_bucket.site.arn]
    actions   = ["s3:ListBucket"]
  }

  statement {
    sid       = "SiteObjects"
    resources = ["${aws_s3_bucket.site.arn}/*"]
    actions   = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
  }

  statement {
    sid       = "Invalidate"
    resources = [aws_cloudfront_distribution.site.arn]
    actions   = ["cloudfront:CreateInvalidation"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
