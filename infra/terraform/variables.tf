variable "aws_region" {
  type        = string
  description = "AWS region for the stack."
  default     = "ap-south-1"
}

variable "environment" {
  type        = string
  description = "Environment name."
  default     = "production"
}

variable "project_name" {
  type        = string
  description = "Project identifier."
  default     = "snooker-platform"
}

variable "image_uri" {
  type        = string
  description = "Container image URI for the web app."
}

variable "app_port" {
  type        = number
  description = "Container port."
  default     = 3000
}

variable "desired_count" {
  type        = number
  description = "Desired ECS task count."
  default     = 2
}

variable "cpu" {
  type        = number
  description = "Fargate task CPU units."
  default     = 512
}

variable "memory" {
  type        = number
  description = "Fargate task memory in MiB."
  default     = 1024
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Public subnet CIDRs."
  default     = ["10.20.1.0/24", "10.20.2.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "Private subnet CIDRs."
  default     = ["10.20.11.0/24", "10.20.12.0/24"]
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block."
  default     = "10.20.0.0/16"
}

variable "app_secret_arns" {
  type = object({
    mongodb_uri          = string
    nextauth_secret      = string
    google_client_id     = optional(string)
    google_client_secret = optional(string)
    pusher_app_id        = optional(string)
    pusher_secret        = optional(string)
    pusher_key           = optional(string)
    pusher_cluster       = optional(string)
    smtp_host            = optional(string)
    smtp_port            = optional(string)
    smtp_user            = optional(string)
    smtp_pass            = optional(string)
    smtp_from            = optional(string)
    alert_webhook_url    = optional(string)
    billing_api_key      = optional(string)
    vapid_private_key    = string
  })
  description = "Secrets Manager ARNs for sensitive runtime values."
}

variable "public_env" {
  type = object({
    nextauth_url                 = string
    next_public_vapid_public_key = string
    vapid_subject                = string
    upload_storage_mode          = string
    upload_object_endpoint       = optional(string)
    upload_object_public_base_url = optional(string)
    billing_checkout_endpoint    = optional(string)
  })
  description = "Non-secret environment values."
}
