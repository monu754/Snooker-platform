output "load_balancer_dns_name" {
  value       = aws_lb.app.dns_name
  description = "Public ALB DNS name."
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.app.name
  description = "ECS cluster name."
}

output "cloudwatch_dashboard_name" {
  value       = aws_cloudwatch_dashboard.app.dashboard_name
  description = "CloudWatch dashboard for the stack."
}
