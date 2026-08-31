# 프론트엔드: S3(비공개) + CloudFront(OAC) + ACM + Route 53.
#
# Cloudflare Pages가 설정은 더 간단하지만 인프라가 두 벤더로 쪼개진다(ADR-006).
# 백엔드를 AWS로 확정한 이상 정적 자산도 같은 계정·같은 IaC 안에 둔다.

resource "aws_s3_bucket" "site" {
  # 버킷 이름은 전 세계에서 유일해야 한다. 계정 번호를 붙여 충돌을 피한다.
  bucket = "${local.name}-site-${data.aws_caller_identity.current.account_id}"
}

# 버킷은 끝까지 비공개다. 공개 접근은 CloudFront만 거친다.
resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# --- 인증서 (반드시 us-east-1) ---

resource "aws_acm_certificate" "site" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = var.include_www ? [local.www_name] : []
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_route53_zone" "root" {
  name         = var.hosted_zone_name
  private_zone = false
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for option in aws_acm_certificate.site.domain_validation_options :
    option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  zone_id         = data.aws_route53_zone.root.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# --- CloudFront ---

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.name}-site"
  description                       = "S3 오리진 서명"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 관리형 캐시 정책. 직접 만들면 관리할 것만 늘고 얻는 것이 없다.
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

# HSTS·X-Content-Type-Options·Referrer-Policy 등을 붙인다. 정적 사이트라
# 직접 고를 것이 없어 관리형을 그대로 쓴다.
data "aws_cloudfront_response_headers_policy" "security" {
  name = "Managed-SecurityHeadersPolicy"
}

# www로 온 요청을 apex로 돌려보낸다. 두 주소에서 같은 내용을 서비스하면 검색
# 엔진과 사용자 모두에게 정본이 둘로 보이므로, 잡되 하나로 모은다.
#
# CloudFront Function은 ES5.1 수준이라 템플릿 리터럴이나 화살표 함수를 쓸 수
# 없다. 쿼리 문자열은 직접 다시 엮는다 — 리다이렉트가 조용히 버리면 나중에
# 추적 파라미터 같은 것이 사라진 이유를 찾기 어렵다.
resource "aws_cloudfront_function" "canonical_host" {
  count = var.include_www ? 1 : 0

  name    = "${local.name}-canonical-host"
  runtime = "cloudfront-js-2.0"
  publish = true
  comment = "www.${var.domain_name} -> ${var.domain_name}"

  code = <<-JS
    function handler(event) {
        var request = event.request;
        var host = request.headers.host ? request.headers.host.value : '';
        if (host !== '${local.www_name}') {
            return request;
        }

        var query = '';
        for (var key in request.querystring) {
            var item = request.querystring[key];
            query += (query === '' ? '?' : '&') + key + '=' + item.value;
        }

        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                location: { value: 'https://${var.domain_name}' + request.uri + query }
            }
        };
    }
  JS
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name} static site"
  default_root_object = "index.html"
  aliases             = var.include_www ? [var.domain_name, local.www_name] : [var.domain_name]
  price_class         = var.cloudfront_price_class

  # 접근 로그를 켜지 않는다. 켜면 방문자 IP가 담긴 로그가 버킷에 쌓이는데,
  # 푸터의 개인정보 고지가 말하는 범위를 넘는다. 필요해지면 고지를 먼저 고치고
  # 나서 켜야 한다 — 순서가 반대면 고지가 거짓이 된다.

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id = "s3-site"
    # .app은 HSTS preload TLD라 브라우저가 http를 시도조차 하지 않는다. 그래도
    # 리다이렉트를 걸어 둔다 — 프리로드 목록을 모르는 클라이언트도 있다.
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id

    dynamic "function_association" {
      for_each = var.include_www ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.canonical_host[0].arn
      }
    }
  }

  # SPA 폴백. 삭제한 `_redirects`(Netlify 전용 문법)가 하던 일을 여기서 한다.
  # 이게 없으면 /how-it-works나 /credits로 직접 들어온 사람이 404를 받는다 —
  # 라우트가 셋인 이 서비스에서는 실제로 걸리는 문제다.
  #
  # OAC를 쓰는 S3 오리진은 없는 키에 404가 아니라 403을 준다. 그래서 둘 다 잡는다.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# CloudFront만 버킷을 읽을 수 있다. SourceArn 조건이 없으면 다른 사람의
# 배포에서도 이 버킷을 오리진으로 삼을 수 있다.
data "aws_iam_policy_document" "site_bucket" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.site]
}

# --- DNS ---

resource "aws_route53_record" "site_a" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "site_aaaa" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# www도 같은 배포를 가리킨다. 내용을 주는 것이 아니라, 위 Function이 apex로
# 돌려보낼 수 있도록 요청이 CloudFront까지는 닿게 하기 위한 것이다.
resource "aws_route53_record" "www_a" {
  count = var.include_www ? 1 : 0

  zone_id = data.aws_route53_zone.root.zone_id
  name    = local.www_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  count = var.include_www ? 1 : 0

  zone_id = data.aws_route53_zone.root.zone_id
  name    = local.www_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
