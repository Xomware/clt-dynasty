# S3 + CloudFront + ACM + Route53 for var.domain_name. The bucket, distribution
# and A record were the old site's and are adopted by imports.tf. Never remove
# this block or revert the PR that added it: the next apply would destroy all
# three. Fix forward.
module "web" {
  source = "git::https://github.com/domgiordano/web-hosting.git?ref=v1.8.0"

  app_name    = var.app_name
  domain_name = var.domain_name
  zone_id     = data.aws_route53_zone.web_zone.zone_id
  waf_acl_arn = data.aws_ssm_parameter.shared_cloudfront_waf_arn.value

  # trailingSlash static export: only /foo/index.html exists, so /foo 301s to
  # /foo/ instead of falling through to the SPA error path.
  enable_subroute_rewrite = true
  subroute_style          = "directory"

  spa_error_path      = "/index.html"
  enable_cache        = true
  minimum_tls_version = "TLSv1.2_2021"
  retain_on_delete    = false

  # The module defaults to true. A mistaken destroy should stop at a non-empty
  # bucket rather than empty it.
  force_destroy = false
}
