locals {
  # Function URL은 끝에 슬래시가 붙어 나온다. 프론트엔드는 이 값에
  # `/api/analyze`를 이어 붙이고(services/pixelzoom.js), 백엔드 워크플로는
  # `/api/health`를 붙인다. 슬래시를 그대로 두면 `//api/health`가 되어
  # 배포 직후 스모크 테스트가 404로 떨어진다.
  api_base_url = trimsuffix(aws_lambda_function_url.api.function_url, "/")
}

output "aws_region" {
  description = "GitHub Variable: AWS_REGION"
  value       = var.region
}

output "aws_deploy_role_arn" {
  description = "GitHub Secret: AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.deploy.arn
}

output "ecr_repository" {
  description = "GitHub Variable: ECR_REPOSITORY"
  value       = aws_ecr_repository.backend.name
}

output "ecr_repository_url" {
  description = "docker push 대상. 첫 부트스트랩 이미지를 여기에 올린다."
  value       = aws_ecr_repository.backend.repository_url
}

output "lambda_function_name" {
  description = "GitHub Variable: LAMBDA_FUNCTION_NAME"
  value       = aws_lambda_function.api.function_name
}

output "api_base_url" {
  description = "GitHub Variable: API_BASE_URL (끝 슬래시 없음)"
  value       = local.api_base_url
}

output "s3_bucket" {
  description = "GitHub Variable: S3_BUCKET"
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "GitHub Variable: CLOUDFRONT_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.site.id
}

output "site_url" {
  description = "사이트 주소."
  value       = local.site_origin
}

output "cloudfront_domain_name" {
  description = "CloudFront가 준 기본 도메인. DNS가 아직 안 퍼졌을 때 확인용."
  value       = aws_cloudfront_distribution.site.domain_name
}

# 값을 손으로 옮겨 적다 보면 하나씩 틀린다. 그대로 붙여 넣을 수 있게 만들어 둔다.
output "github_setup" {
  description = "저장소에 넣을 Secret/Variable 설정 명령."
  value       = <<-EOT

    gh secret   set AWS_DEPLOY_ROLE_ARN      --repo ${var.github_repository} --body '${aws_iam_role.deploy.arn}'
    gh variable set AWS_REGION               --repo ${var.github_repository} --body '${var.region}'
    gh variable set ECR_REPOSITORY           --repo ${var.github_repository} --body '${aws_ecr_repository.backend.name}'
    gh variable set LAMBDA_FUNCTION_NAME     --repo ${var.github_repository} --body '${aws_lambda_function.api.function_name}'
    gh variable set API_BASE_URL             --repo ${var.github_repository} --body '${local.api_base_url}'
    gh variable set S3_BUCKET                --repo ${var.github_repository} --body '${aws_s3_bucket.site.bucket}'
    gh variable set CLOUDFRONT_DISTRIBUTION_ID --repo ${var.github_repository} --body '${aws_cloudfront_distribution.site.id}'
  EOT
}
