# 월 예산 알림.
#
# 원래 요구사항이 "비용 최소화"였으므로, 청구서보다 먼저 알아채는 장치를 코드에
# 둔다. budget_alert_emails가 비어 있으면 아무것도 만들지 않는다.
#
# 계정당 예산 2개까지는 무료다.

resource "aws_budgets_budget" "monthly" {
  count = length(var.budget_alert_emails) > 0 ? 1 : 0

  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # 태그 기준으로 좁히는 경우. 결제 콘솔에서 Project를 비용 할당 태그로
  # 활성화해 두지 않으면 이 필터는 아무것도 잡지 못한다.
  dynamic "cost_filter" {
    for_each = var.budget_scope == "project" ? [1] : []
    content {
      name   = "TagKeyValue"
      values = ["user:Project$${var.project}"]
    }
  }

  # 이미 쓴 금액이 80%를 넘었을 때. 늦게 알아도 되는 종류의 신호다.
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  # 이 추세면 한도를 넘길 것 같을 때. 실제로 넘기기 전에 손쓸 수 있어야 하므로
  # 예측 기반 알림이 더 쓸모 있다.
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }
}
