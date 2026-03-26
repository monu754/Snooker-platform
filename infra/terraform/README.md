# Terraform AWS Baseline

This stack provides an in-repo IaC baseline for production deployment of the Snooker platform web app.

## What It Provisions

- VPC
- public and private subnets
- internet gateway and public routing
- application load balancer
- ECS Fargate cluster, task definition, and service
- CloudWatch log group
- CloudWatch dashboard
- secrets-driven runtime configuration wiring

## What You Still Need To Provide

- container image in ECR or another reachable registry
- MongoDB/Atlas/DocumentDB connection secret
- VAPID keys
- auth, email, push, upload, and billing secrets as needed

## Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Notes

- the app health check is `/api/health`
- metrics can be scraped from `/api/metrics`
- the ECS task uses Secrets Manager ARNs for sensitive values
