output "archive_bucket" {
  description = "Target for the Supabase dump uploads."
  value       = aws_s3_bucket.archive.id
}
