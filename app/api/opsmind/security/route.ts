import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";
import { getS3Buckets } from "@/lib/aws/s3";
import { getRDSInstances } from "@/lib/aws/rds";
import { getEKSClusters } from "@/lib/aws/eks";

type SecurityFinding = {
  id: string;
  severity: "critical" | "warning" | "healthy" | "info";
  service: string;
  title: string;
  description: string;
  recommendation: string;
};

export async function GET() {
  try {
    const [ec2, s3, rds, eks] = await Promise.all([
      getEC2Instances(),
      getS3Buckets(),
      getRDSInstances(),
      getEKSClusters(),
    ]);

    const findings: SecurityFinding[] = [];

    const runningEC2 = ec2.filter(
      (instance: any) => instance.State?.Name === "running"
    );

    const stoppedEC2 = ec2.filter(
      (instance: any) => instance.State?.Name === "stopped"
    );

    /*
     * EC2 Security Checks
     */

    if (ec2.length === 0) {
      findings.push({
        id: "SEC-EC2-001",
        severity: "info",
        service: "EC2",
        title: "No EC2 instances detected",
        description:
          "No EC2 instances were discovered in the connected AWS region.",
        recommendation:
          "No EC2 security action is required. Verify the AWS region if compute resources are expected.",
      });
    } else {
      findings.push({
        id: "SEC-EC2-002",
        severity: "healthy",
        service: "EC2",
        title: `${ec2.length} EC2 instance${ec2.length > 1 ? "s" : ""} discovered`,
        description:
          `${runningEC2.length} instance${runningEC2.length === 1 ? "" : "s"} currently running.`,
        recommendation:
          "Review security groups, IAM roles, public IP exposure, patching status and instance metadata configuration.",
      });
    }

    if (stoppedEC2.length > 0) {
      findings.push({
        id: "SEC-EC2-003",
        severity: "warning",
        service: "EC2",
        title: `${stoppedEC2.length} stopped EC2 instance${stoppedEC2.length > 1 ? "s" : ""}`,
        description:
          "Stopped EC2 instances were detected. Their attached EBS storage may continue to incur charges.",
        recommendation:
          "Review whether the stopped instances are still required. Remove unused instances and volumes.",
      });
    }

    /*
     * S3 Security Checks
     */

    if (s3.length === 0) {
      findings.push({
        id: "SEC-S3-001",
        severity: "info",
        service: "S3",
        title: "No S3 buckets detected",
        description:
          "No S3 buckets were discovered in the connected AWS environment.",
        recommendation:
          "No S3 security action is required unless object storage is expected.",
      });
    } else {
      findings.push({
        id: "SEC-S3-002",
        severity: "healthy",
        service: "S3",
        title: `${s3.length} S3 bucket${s3.length > 1 ? "s" : ""} discovered`,
        description:
          "S3 resources are visible to the security scanner.",
        recommendation:
          "Verify Block Public Access, bucket policies, encryption, versioning and lifecycle configuration.",
      });
    }

    /*
     * RDS Security Checks
     */

    if (rds.length === 0) {
      findings.push({
        id: "SEC-RDS-001",
        severity: "info",
        service: "RDS",
        title: "No RDS databases detected",
        description:
          "No RDS database instances were discovered in the connected AWS region.",
        recommendation:
          "No RDS security action is required unless a managed database is expected.",
      });
    } else {
      findings.push({
        id: "SEC-RDS-002",
        severity: "warning",
        service: "RDS",
        title: `${rds.length} RDS database${rds.length > 1 ? "s" : ""} detected`,
        description:
          "Managed database infrastructure was discovered.",
        recommendation:
          "Verify encryption at rest, automated backups, deletion protection, public accessibility and security-group rules.",
      });
    }

    /*
     * EKS Security Checks
     */

    if (eks.length === 0) {
      findings.push({
        id: "SEC-EKS-001",
        severity: "info",
        service: "EKS",
        title: "No EKS clusters detected",
        description:
          "No Kubernetes clusters were discovered in the connected AWS region.",
        recommendation:
          "No EKS security action is required unless Kubernetes workloads are expected.",
      });
    } else {
      findings.push({
        id: "SEC-EKS-002",
        severity: "warning",
        service: "EKS",
        title: `${eks.length} EKS cluster${eks.length > 1 ? "s" : ""} detected`,
        description:
          "Kubernetes infrastructure is available and should be reviewed for security configuration.",
        recommendation:
          "Review cluster endpoint access, IAM roles, RBAC, node security, secrets handling and network policies.",
      });
    }

    /*
     * Overall Security Assessment
     */

    const critical = findings.filter(
      (finding) => finding.severity === "critical"
    ).length;

    const warnings = findings.filter(
      (finding) => finding.severity === "warning"
    ).length;

    const healthy = findings.filter(
      (finding) => finding.severity === "healthy"
    ).length;

    const info = findings.filter(
      (finding) => finding.severity === "info"
    ).length;

    const totalResources =
      ec2.length + s3.length + rds.length + eks.length;

    let securityScore = 100;

    securityScore -= critical * 30;
    securityScore -= warnings * 10;

    securityScore = Math.max(0, Math.min(100, securityScore));

    let securityStatus = "Healthy";

    if (securityScore < 50) {
      securityStatus = "Critical";
    } else if (securityScore < 80) {
      securityStatus = "Needs Attention";
    } else if (warnings > 0) {
      securityStatus = "Review Recommended";
    }

    return NextResponse.json({
      success: true,
      region: process.env.AWS_REGION || "ap-south-1",

      summary: {
        securityScore,
        securityStatus,
        totalResources,
        totalFindings: findings.length,
        critical,
        warnings,
        healthy,
        info,
      },

      findings,

      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("OpsMind Security Intelligence error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to scan AWS security posture",
      },
      { status: 500 }
    );
  }
}
