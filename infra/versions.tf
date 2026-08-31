terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  # 상태는 지금 로컬에 둡니다. 혼자 배포하는 단계라 원격 상태가 주는 잠금과
  # 공유의 값이 아직 없고, 상태를 담을 버킷을 먼저 만들어야 하는 닭과 달걀
  # 문제만 생깁니다. 팀원이 함께 apply하게 되는 시점에 아래 블록을 열고
  # `terraform init -migrate-state`를 한 번 돌리면 됩니다.
  #
  # backend "s3" {
  #   bucket         = "pixelzoom-tfstate-<account-id>"
  #   key            = "pixelzoom/terraform.tfstate"
  #   region         = "ap-northeast-2"
  #   dynamodb_table = "pixelzoom-tflock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# CloudFront가 쓰는 ACM 인증서는 **반드시 us-east-1**에 있어야 합니다. 리전
# 하나짜리 서비스인데 프로바이더가 둘인 이유가 이것뿐입니다.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}

data "aws_caller_identity" "current" {}
