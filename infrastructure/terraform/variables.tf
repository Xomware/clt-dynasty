variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Resource name prefix and the /clt-dynasty/* SSM prefix."
  type        = string
  default     = "clt-dynasty"
}

variable "domain_name" {
  description = "Public hostname for the site. Also the site bucket's name."
  type        = string
  default     = "clt.dynasty.xomware.com"
}

variable "route53_zone_name" {
  description = "Hosted zone that domain_name lives in."
  type        = string
  default     = "xomware.com"
}

variable "environment" {
  description = "Tag value only. There is one deployed environment."
  type        = string
  default     = "production"
}
