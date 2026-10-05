# The old site's resources, from the clt-dynasty-league state (step 0c). The
# OAC and response headers policy are adopted too: the module gives them the
# same names the old stack did, and CloudFront rejects a duplicate name.
# Terraform 1.5 needs literal ids; Z0212401124Q11NWHM1D1 is the xomware.com zone.
import {
  to = module.web.aws_s3_bucket.site
  id = "clt.dynasty.xomware.com"
}

import {
  to = module.web.aws_cloudfront_distribution.site
  id = "E2C3YYJUEV78O7"
}

import {
  to = module.web.aws_route53_record.site
  id = "Z0212401124Q11NWHM1D1_clt.dynasty.xomware.com_A"
}

import {
  to = module.web.aws_cloudfront_origin_access_control.site
  id = "E28E7LS54VX05I"
}

import {
  to = module.web.aws_cloudfront_response_headers_policy.site
  id = "228981d1-ef88-49b7-957c-dde0e2f2b347"
}
