output "archive_bucket" {
  description = "Target for the Supabase dump uploads."
  value       = aws_s3_bucket.archive.id
}

output "cloudfront_distribution_id" {
  description = "Site distribution."
  value       = module.web.cloudfront_distribution_id
}

output "deploy_role_arn" {
  description = "AWS_DEPLOY_ROLE_ARN in Infisical /clt-dynasty."
  value       = aws_iam_role.deploy.arn
}
