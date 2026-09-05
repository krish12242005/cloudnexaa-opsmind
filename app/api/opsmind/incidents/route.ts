import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";
import { getS3Buckets } from "@/lib/aws/s3";
import { getRDSInstances } from "@/lib/aws/rds";
import { getEKSClusters } from "@/lib/aws/eks";

type IncidentSeverity = "critical" | "high" | "medium" | "low";

type Incident = {
  id: string;
  severity: IncidentSeverity;
  service: string;
  title: string;
  description: string;
  recommendation: string;
  status: "open" | "investigating" | "resolved";
  detectedAt: string;
};

export async function GET() {
  try {
    const [ec2, s3, rds, eks] = await Promise.all([
      getEC2Instances(),
      getS3Buckets(),
      getRDSInstances(),
      getEKSClusters(),
    ]);

    const incidents: Incident[] = [];
    const detectedAt = new Date().toISOString();

    const runningEC2 = ec2.filter(
      (instance: any) => instance.State?.Name === "running"
    );

    const stoppedEC2 = ec2.filter(
      (instance: any) => instance.State?.Name === "stopped"
    );

    if (stoppedEC2.length > 0) {
      incidents.push({
        id: "INC-EC2-001",
        severity: "medium",
        service: "EC2",
        title: `${stoppedEC2.length} stopped EC2 instances detected`,
        description:
          "OpsMind detected stopped EC2 instances that may represent unused infrastructure or an interrupted workload.",
        recommendation:
          "Investigate the stopped instances. Terminate unused resources and verify EBS volumes to reduce unnecessary cost.",
        status: "open",
        detectedAt,
      });
    }

    if (ec2.length > 0 && runningEC2.length === 0) {
      incidents.push({
        id: "INC-EC2-002",
        severity: "critical",
        service: "EC2",
        title: "No EC2 instances are currently running",
        description:
          "EC2 infrastructure exists, but no instances are in the running state.",
        recommendation:
          "Immediately verify workload availability and investigate instance, application, and deployment health.",
        status: "open",
        detectedAt,
      });
    }

    if (s3.length > 0) {
      incidents.push({
        id: "INC-S3-001",
        severity: "low",
        service: "S3",
        title: "S3 security review recommended",
        description:
          `${s3.length} S3 bucket${s3.length > 1 ? "s" : ""} detected in the connected environment.`,
        recommendation:
          "Review Block Public Access, bucket policies, encryption, versioning, lifecycle rules and logging.",
        status: "open",
        detectedAt,
      });
    }

    if (rds.length > 0) {
      incidents.push({
        id: "INC-RDS-001",
        severity: "low",
        service: "RDS",
        title: "RDS security configuration review",
        description:
          `${rds.length} RDS database${rds.length > 1 ? "s" : ""} detected.`,
        recommendation:
          "Review public accessibility, encryption, backups, deletion protection and security-group configuration.",
        status: "open",
        detectedAt,
      });
    }

    if (eks.length > 0) {
      incidents.push({
        id: "INC-EKS-001",
        severity: "low",
        service: "EKS",
        title: "EKS security configuration review",
        description:
          `${eks.length} EKS cluster${eks.length > 1 ? "s" : ""} detected.`,
        recommendation:
          "Review cluster endpoint access, IAM, RBAC, node security, secrets and network policies.",
        status: "open",
        detectedAt,
      });
    }

    const critical = incidents.filter(
      (incident) => incident.severity === "critical"
    ).length;

    const high = incidents.filter(
      (incident) => incident.severity === "high"
    ).length;

    const medium = incidents.filter(
      (incident) => incident.severity === "medium"
    ).length;

    const low = incidents.filter(
      (incident) => incident.severity === "low"
    ).length;

    return NextResponse.json({
      success: true,
      region: process.env.AWS_REGION || "ap-south-1",
      summary: {
        total: incidents.length,
        open: incidents.filter(
          (incident) => incident.status === "open"
        ).length,
        investigating: incidents.filter(
          (incident) => incident.status === "investigating"
        ).length,
        resolved: incidents.filter(
          (incident) => incident.status === "resolved"
        ).length,
        critical,
        high,
        medium,
        low,
      },
      incidents,
      detectedAt,
    });
  } catch (error) {
    console.error("OpsMind Incident Intelligence error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to detect infrastructure incidents",
      },
      { status: 500 }
    );
  }
}
