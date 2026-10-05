# Used only by the Supabase archive bucket (s3_archive.tf). The dumps hold
# member emails, so reading them takes S3 access and this key.
data "aws_iam_policy_document" "archive_key" {
  # The standard root statement: it lets IAM policies grant use of the key.
  # Without it the key becomes unmanageable, IAM included.
  statement {
    sid       = "EnableIAMUserPermissions"
    actions   = ["kms:*"]
    resources = ["*"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${local.account_id}:root"]
    }
  }

  # The pipeline roles hold AdministratorAccess-style grants on "*", so IAM
  # alone would let any merged workflow read the dumps. Only a human's
  # credentials should decrypt them.
  statement {
    sid       = "DenyPipelineReads"
    effect    = "Deny"
    actions   = ["kms:Decrypt", "kms:ReEncryptFrom"]
    resources = ["*"]
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
    condition {
      test     = "StringLike"
      variable = "aws:PrincipalArn"
      values   = ["arn:aws:iam::${local.account_id}:role/*-github-actions-*"]
    }
  }
}

resource "aws_kms_key" "archive" {
  description             = "CMK for the ${var.app_name} Supabase archive bucket"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.archive_key.json

  # Deleting the key makes every archived dump unreadable.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_kms_alias" "archive" {
  name          = "alias/${var.app_name}-supabase-archive"
  target_key_id = aws_kms_key.archive.key_id
}
