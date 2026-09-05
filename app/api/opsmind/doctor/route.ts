import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";
import { getS3Buckets } from "@/lib/aws/s3";
import { getRDSInstances } from "@/lib/aws/rds";
import { getEKSClusters } from "@/lib/aws/eks";

export async function GET() {
  try {
    const [ec2, s3, rds, eks] = await Promise.all([
      getEC2Instances(),
      getS3Buckets(),
      getRDSInstances(),
      getEKSClusters(),
    ]);

    const runningEC2 = ec2.filter(
      (instance: any) => instance.state === "running"
    );

    const stoppedEC2 = ec2.filter(
      (instance: any) => instance.state === "stopped"
    );

    const findings = [];

    if (stoppedEC2.length > 0) {
      findings.push({
        id: "DOC-EC2-001",
        service: "EC2",
        severity: "warning",
        title: "Stopped EC2 instances detected",
        description: `${stoppedEC2.length} stopped EC2 instance(s) detected.`,
        recommendation:
          "Review stopped instances before considering cleanup.",
        affectedResources: stoppedEC2.length,
        remediationMode: "dry-run",
      });
    }

    if (ec2.length > 0 && runningEC2.length === 0) {
      findings.push({
        id: "DOC-EC2-002",
        service: "EC2",
        severity: "critical",
        title: "No running EC2 instances",
        description: "EC2 resources exist but none are running.",
        recommendation:
          "Verify whether the workload is intentionally stopped.",
        affectedResources: ec2.length,
        remediationMode: "dry-run",
      });
    }

    if (ec2.length === 0) {
      findings.push({
        id: "DOC-EC2-003",
        service: "EC2",
        severity: "info",
        title: "No EC2 instances found",
        description: "No EC2 instances were discovered.",
        recommendation: "No EC2 action required.",
        affectedResources: 0,
        remediationMode: "none",
      });
    }

    if (s3.length > 0) {
      findings.push({
        id: "DOC-S3-001",
        service: "S3",
        severity: "healthy",
        title: "S3 resources detected",
        description: `${s3.length} S3 bucket(s) discovered.`,
        recommendation:
          "Continue monitoring bucket security and lifecycle configuration.",
        affectedResources: s3.length,
        remediationMode: "none",
      });
    }

    if (rds.length === 0) {
      findings.push({
        id: "DOC-RDS-001",
        service: "RDS",
        severity: "info",
        title: "No RDS instances found",
        description: "No RDS instances were discovered.",
        recommendation: "No RDS action required.",
        affectedResources: 0,
        remediationMode: "none",
      });
    }

    if (eks.length === 0) {
      findings.push({
        id: "DOC-EKS-001",
        service: "EKS",
        severity: "info",
        title: "No EKS clusters found",
        description: "No EKS clusters were discovered.",
        recommendation: "No Kubernetes action required.",
        affectedResources: 0,
        remediationMode: "none",
      });
    }

    const critical = findings.filter(
      (item) => item.severity === "critical"
    ).length;

    const warnings = findings.filter(
      (item) => item.severity === "warning"
    ).length;

    const healthy = findings.filter(
      (item) => item.severity === "healthy"
    ).length;

    const info = findings.filter(
      (item) => item.severity === "info"
    ).length;

    const score = Math.max(
      0,
      Math.min(100, 100 - critical * 30 - warnings * 10)
    );

    return NextResponse.json({
      success: true,
      region: "ap-south-1",
      scannedAt: new Date().toISOString(),

      summary: {
        score,
        totalFindings: findings.length,
        critical,
        warnings,
        healthy,
        info,
      },

      infrastructure: {
        ec2: ec2.length,
        runningEC2: runningEC2.length,
        stoppedEC2: stoppedEC2.length,
        s3: s3.length,
        rds: rds.length,
        eks: eks.length,
      },

      findings,
    });
  } catch (error) {
    console.error("Cloud Doctor error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cloud Doctor scan failed",
      },
      { status: 500 }
    );
  }
}
