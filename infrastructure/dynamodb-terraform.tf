# DynamoDB Table for ToggleBox Remote Config
# Terraform configuration with proper GSI for stable version queries

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "billing_mode" {
  description = "Billing mode for DynamoDB table"
  type        = string
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.billing_mode)
    error_message = "Billing mode must be PAY_PER_REQUEST or PROVISIONED."
  }
}

variable "read_capacity" {
  description = "Read capacity units (only used if billing_mode is PROVISIONED)"
  type        = number
  default     = 5
}

variable "write_capacity" {
  description = "Write capacity units (only used if billing_mode is PROVISIONED)"
  type        = number
  default     = 5
}

resource "aws_dynamodb_table" "configurations" {
  name           = "${var.environment}-togglebox-configurations"
  billing_mode   = var.billing_mode
  hash_key       = "PK"
  range_key      = "SK"

  # Only set read/write capacity if using PROVISIONED billing
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null

  # Primary key attributes
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI attributes for stable version queries
  attribute {
    name = "GSI_PK"
    type = "S"
  }

  attribute {
    name = "GSI_SK"
    type = "S"
  }

  # Global Secondary Index for stable version queries
  # This is a SPARSE index - only items with GSI_PK/GSI_SK are indexed
  global_secondary_index {
    name            = "StableVersionIndex"
    hash_key        = "GSI_PK"
    range_key       = "GSI_SK"
    projection_type = "ALL"

    # Only set read/write capacity if using PROVISIONED billing
    read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null
  }

  # Point-in-time recovery (enabled for production)
  point_in_time_recovery {
    enabled = var.environment == "production" ? true : false
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = null  # Use AWS managed key (or specify your own KMS key ARN)
  }

  # TTL configuration (optional - not currently used)
  # ttl {
  #   enabled        = true
  #   attribute_name = "ttl"
  # }

  # Tags
  tags = {
    Environment = var.environment
    Application = "ToggleBox"
    ManagedBy   = "Terraform"
  }

  # Lifecycle policy
  lifecycle {
    prevent_destroy = false  # Set to true for production to prevent accidental deletion
  }
}

# CloudWatch alarm for read throttling
resource "aws_cloudwatch_metric_alarm" "read_throttle" {
  alarm_name          = "${var.environment}-togglebox-read-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "DynamoDB read throttling detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.configurations.name
  }

  tags = {
    Environment = var.environment
    Application = "ToggleBox"
  }
}

# CloudWatch alarm for write throttling
resource "aws_cloudwatch_metric_alarm" "write_throttle" {
  alarm_name          = "${var.environment}-togglebox-write-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "WriteThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "DynamoDB write throttling detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.configurations.name
  }

  tags = {
    Environment = var.environment
    Application = "ToggleBox"
  }
}

# Outputs
output "table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.configurations.name
}

output "table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.configurations.arn
}

output "stable_version_index_name" {
  description = "Global Secondary Index name for stable version queries"
  value       = "StableVersionIndex"
}

output "table_stream_arn" {
  description = "DynamoDB table stream ARN (if streams enabled)"
  value       = aws_dynamodb_table.configurations.stream_arn
}
