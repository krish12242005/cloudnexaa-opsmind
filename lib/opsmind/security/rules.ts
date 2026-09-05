export type SecuritySeverity = "critical" | "warning" | "healthy" | "info";

export type SecurityFinding = {
  id: string;
  severity: SecuritySeverity;
  service: string;
  title: string;
  description: string;
  recommendation: string;
};

type SecurityInput = {
  region: string;
  resources: {
    ec2: {
      count: number;
      instances: any[];
    };
    s3: {
      count: number;
      buckets: any[];
    };
    rds: {
      count: number;
      instances: any[];
    };
    eks: {
      count: number;
      clusters: any[];
    };
  };
};

export function analyzeSecurity(
  data: SecurityInput
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  const ec2Instances = data.resources.ec2.instances ?? [];

  // EC2 inventory visibility
  if (ec2Instances.length > 0) {
    findings.push({
      id: "SEC-EC2-001",
      severity: "healthy",
      service: "EC2",
      title: `${ec2Instances.length} EC2 instances discovered`,
      description:
        "OpsMind can inspect the EC2 inventory in the connected AWS region.",
      recommendation:
        "Continue monitoring instance exposure, security groups, IAM roles and network configuration.",
    });
  } else {
    findings.push({
      id: "SEC-EC2-002",
      severity: "info",
      service: "EC2",
      title: "No EC2 instances discovered",
      description:
        "No EC2 instances were found in the selected AWS region.",
      recommendation:
        "Verify the selected region if EC2 infrastructure is expected.",
    });
  }

  // Public IPv4 visibility
  const publicInstances = ec2Instances.filter(
    (instance) => instance.PublicIpAddress
  );

  if (publicInstances.length > 0) {
    findings.push({
      id: "SEC-NET-001",
      severity: "warning",
      service: "Network",
      title: `${publicInstances.length} EC2 instance${
        publicInstances.length > 1 ? "s" : ""
      } with public IPv4 detected`,
      description:
        "OpsMind detected EC2 instances with public IPv4 addresses.",
      recommendation:
        "Review whether public exposure is required. Prefer private subnets and controlled ingress through load balancers where possible.",
    });
  } else {
    findings.push({
      id: "SEC-NET-002",
      severity: "healthy",
      service: "Network",
      title: "No public EC2 IPv4 detected",
      description:
        "No public IPv4 addresses were present in the discovered EC2 inventory.",
      recommendation:
        "Continue using private networking wherever public exposure is unnecessary.",
    });
  }

  // S3 inventory
  if (data.resources.s3.count > 0) {
    findings.push({
      id: "SEC-S3-001",
      severity: "info",
      service: "S3",
      title: `${data.resources.s3.count} S3 bucket${
        data.resources.s3.count > 1 ? "s" : ""
      } discovered`,
      description:
        "S3 bucket inventory is available to OpsMind.",
      recommendation:
        "Next, inspect bucket public-access settings, encryption, versioning and access policies.",
    });
  } else {
    findings.push({
      id: "SEC-S3-002",
      severity: "info",
      service: "S3",
      title: "No S3 buckets discovered",
      description:
        "No S3 buckets were returned for the connected AWS account.",
      recommendation:
        "No action required unless object storage is expected.",
    });
  }

  // RDS
  if (data.resources.rds.count > 0) {
    findings.push({
      id: "SEC-RDS-001",
      severity: "info",
      service: "RDS",
      title: `${data.resources.rds.count} RDS database${
        data.resources.rds.count > 1 ? "s" : ""
      } discovered`,
      description:
        "RDS database inventory is available to OpsMind.",
      recommendation:
        "Inspect public accessibility, encryption, backup configuration and security groups.",
    });
  } else {
    findings.push({
      id: "SEC-RDS-002",
      severity: "info",
      service: "RDS",
      title: "No RDS databases discovered",
      description:
        "No RDS database instances were found in the selected region.",
      recommendation:
        "No database-specific security action is required until an RDS workload exists.",
    });
  }

  // EKS
  if (data.resources.eks.count > 0) {
    findings.push({
      id: "SEC-EKS-001",
      severity: "info",
      service: "EKS",
      title: `${data.resources.eks.count} EKS cluster${
        data.resources.eks.count > 1 ? "s" : ""
      } discovered`,
      description:
        "Kubernetes cluster inventory is available to OpsMind.",
      recommendation:
        "Inspect cluster endpoint exposure, IAM access, node security and workload permissions.",
    });
  } else {
    findings.push({
      id: "SEC-EKS-002",
      severity: "info",
      service: "EKS",
      title: "No EKS clusters discovered",
      description:
        "No EKS clusters were found in the selected AWS region.",
      recommendation:
        "No Kubernetes-specific security action is required until an EKS workload exists.",
    });
  }

  return findings;
}
