import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { getEC2Instances } from "@/lib/aws/ec2";
import { getS3Buckets } from "@/lib/aws/s3";
import { getRDSInstances } from "@/lib/aws/rds";
import { getEKSClusters } from "@/lib/aws/eks";
import { getIAMUsers, getIAMRoles } from "@/lib/aws/iam";
import { getSecurityGroups } from "@/lib/aws/security-groups";
import { analyzeS3Bucket } from "@/lib/aws/s3-security";
import { analyzeInfrastructure } from "@/lib/opsmind/rules";
import { analyzeIAM } from "@/lib/opsmind/security/iam-rules";
import { analyzeSecurityGroups } from "@/lib/opsmind/security/security-group-rules";

const HISTORY_FILE = path.join(process.cwd(), "data", "scan-history.json");

type Severity = "critical" | "warning" | "healthy" | "info";

type Finding = {
  id: string;
  severity: Severity;
  service: string;
  title: string;
  description: string;
  recommendation: string;
  riskScore?: number;
  resource?: string;
};

function safeMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function readHistory(): Promise<any[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
    await fs.writeFile(HISTORY_FILE, "[]", "utf8");
    return [];
  }
}

async function writeHistory(items: any[]) {
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  await fs.writeFile(
    HISTORY_FILE,
    JSON.stringify(items.slice(0, 50), null, 2),
    "utf8"
  );
}

function countSeverities(findings: Finding[]) {
  return {
    critical: findings.filter((x) => x.severity === "critical").length,
    warnings: findings.filter((x) => x.severity === "warning").length,
    healthy: findings.filter((x) => x.severity === "healthy").length,
    info: findings.filter((x) => x.severity === "info").length,
  };
}

function scoreFrom(findings: Finding[]) {
  const penalty =
    findings.filter((x) => x.severity === "critical").length * 25 +
    findings.filter((x) => x.severity === "warning").length * 10;
  return Math.max(0, Math.min(100, 100 - penalty));
}

function normalizeState(instance: any) {
  return instance?.state ?? instance?.State?.Name ?? "unknown";
}

export async function GET() {
  return NextResponse.json({
    success: true,
    history: await readHistory(),
  });
}

export async function POST() {
  const startedAt = Date.now();
  const region = process.env.AWS_REGION || "ap-south-1";

  const result = {
    success: true,
    scanId: `SCAN-${Date.now()}`,
    region,
    startedAt: new Date().toISOString(),
    durationMs: 0,
    partial: false,
    permissionIssues: [] as string[],
    inventory: {
      ec2: [] as any[],
      s3: [] as any[],
      rds: [] as any[],
      eks: [] as any[],
      iamUsers: [] as any[],
      iamRoles: [] as any[],
      securityGroups: [] as any[],
    },
    s3Security: [] as any[],
    findings: [] as Finding[],
  };

  const settled = await Promise.allSettled([
    getEC2Instances(),
    getS3Buckets(),
    getRDSInstances(),
    getEKSClusters(),
    getIAMUsers(),
    getIAMRoles(),
    getSecurityGroups(),
  ]);

  const [ec2, s3, rds, eks, iamUsers, iamRoles, securityGroups] = settled;

  const pick = <T,>(index: number, label: string): T[] => {
    const entry = settled[index];
    if (entry.status === "fulfilled") return (entry.value as T[]) ?? [];
    result.partial = true;
    result.permissionIssues.push(`${label}: ${safeMessage(entry.reason)}`);
    return [];
  };

  result.inventory.ec2 = pick<any>(0, "EC2");
  result.inventory.s3 = pick<any>(1, "S3");
  result.inventory.rds = pick<any>(2, "RDS");
  result.inventory.eks = pick<any>(3, "EKS");
  result.inventory.iamUsers = pick<any>(4, "IAM users");
  result.inventory.iamRoles = pick<any>(5, "IAM roles");
  result.inventory.securityGroups = pick<any>(6, "Security groups");

  const baseOverview = {
    region,
    resources: {
      ec2: {
        count: result.inventory.ec2.length,
        instances: result.inventory.ec2,
      },
      s3: {
        count: result.inventory.s3.length,
        buckets: result.inventory.s3,
      },
      rds: {
        count: result.inventory.rds.length,
        instances: result.inventory.rds,
      },
      eks: {
        count: result.inventory.eks.length,
        clusters: result.inventory.eks,
      },
    },
  };

  const baseFindings = analyzeInfrastructure(baseOverview) as Finding[];
  const iamFindings = analyzeIAM(
    result.inventory.iamUsers,
    result.inventory.iamRoles
  ) as Finding[];

  const sgFindings = analyzeSecurityGroups(
    result.inventory.securityGroups
  ) as Finding[];

  result.findings.push(...baseFindings, ...iamFindings, ...sgFindings);

  const publicIpv4 = result.inventory.ec2.filter(
    (instance: any) => Boolean(instance.PublicIpAddress)
  );

  if (publicIpv4.length > 0) {
    result.findings.push({
      id: "SCAN-NET-001",
      severity: "warning",
      service: "Network",
      title: `${publicIpv4.length} EC2 instance${publicIpv4.length > 1 ? "s" : ""} has public IPv4`,
      description:
        "Publicly addressable instances increase internet exposure and should be intentional.",
      recommendation:
        "Review the subnet, security group and load-balancer path. Keep workloads private where public exposure is not required.",
    });
  } else {
    result.findings.push({
      id: "SCAN-NET-002",
      severity: "healthy",
      service: "Network",
      title: "No public IPv4 detected on EC2 inventory",
      description:
        "OpsMind did not find public IPv4 addresses on discovered EC2 instances.",
      recommendation:
        "Continue using private networking and controlled ingress.",
    });
  }

  const stopped = result.inventory.ec2.filter(
    (instance: any) => normalizeState(instance) === "stopped"
  );

  if (stopped.length > 0) {
    result.findings.push({
      id: "SCAN-COST-001",
      severity: "warning",
      service: "Cost",
      title: `${stopped.length} stopped EC2 instance${stopped.length > 1 ? "s" : ""} should be reviewed`,
      description:
        "Stopped EC2 instances can still retain billable EBS storage and related resources.",
      recommendation:
        "Review ownership and retention before deleting any unused resources.",
    });
  }

  if (result.inventory.rds.length > 0) {
    result.findings.push({
      id: "SCAN-RDS-001",
      severity: "info",
      service: "RDS",
      title: `${result.inventory.rds.length} RDS database${result.inventory.rds.length > 1 ? "s" : ""} inventoried`,
      description:
        "Managed database resources were discovered in the selected region.",
      recommendation:
        "Review backups, public accessibility, encryption and storage utilization.",
    });
  }

  if (result.inventory.eks.length > 0) {
    result.findings.push({
      id: "SCAN-EKS-001",
      severity: "info",
      service: "EKS",
      title: `${result.inventory.eks.length} EKS cluster${result.inventory.eks.length > 1 ? "s" : ""} inventoried`,
      description:
        "Kubernetes control-plane resources were discovered.",
      recommendation:
        "Review cluster status, node groups, workload health and network policy.",
    });
  }

  // Inspect S3 posture concurrently but cap concurrency to avoid API bursts.
  const buckets = result.inventory.s3.slice(0, 25);
  const s3Security = await Promise.allSettled(
    buckets.map((bucket: any) =>
      analyzeS3Bucket(bucket.Name || bucket.name || "")
    )
  );

  s3Security.forEach((entry, index) => {
    const bucketName =
      buckets[index]?.Name || buckets[index]?.name || "unknown-bucket";

    if (entry.status === "fulfilled") {
      const posture = entry.value;
      result.s3Security.push(posture);

      if (!posture.publicAccessBlocked || posture.publicPolicy) {
        result.findings.push({
          id: `SCAN-S3-PUBLIC-${index + 1}`,
          severity: "warning",
          service: "S3",
          title: `Review public access on ${bucketName}`,
          description:
            "The bucket posture indicates public-access controls are not fully closed or a public policy may exist.",
          recommendation:
            "Confirm that public access is intentional. Prefer Block Public Access and tightly scoped bucket policies.",
          resource: bucketName,
        });
      }

      if (!posture.encrypted) {
        result.findings.push({
          id: `SCAN-S3-ENC-${index + 1}`,
          severity: "warning",
          service: "S3",
          title: `Encryption posture needs review for ${bucketName}`,
          description:
            "OpsMind could not confirm default bucket encryption through the current permission set.",
          recommendation:
            "Verify default encryption and the bucket's data-protection requirements.",
          resource: bucketName,
        });
      }
    } else {
      result.partial = true;
      result.permissionIssues.push(
        `S3 security ${bucketName}: ${safeMessage(entry.reason)}`
      );
    }
  });

  const counts = countSeverities(result.findings);
  const totalResources =
    result.inventory.ec2.length +
    result.inventory.s3.length +
    result.inventory.rds.length +
    result.inventory.eks.length +
    result.inventory.iamUsers.length +
    result.inventory.iamRoles.length;

  result.durationMs = Date.now() - startedAt;

  const summary = {
    totalResources,
    totalFindings: result.findings.length,
    ...counts,
    score: scoreFrom(result.findings),
  };

  const history = await readHistory();
  history.unshift({
    scanId: result.scanId,
    region,
    startedAt: result.startedAt,
    durationMs: result.durationMs,
    partial: result.partial,
    permissionIssues: result.permissionIssues.slice(0, 10),
    summary,
  });
  await writeHistory(history);

  return NextResponse.json({
    ...result,
    summary,
    history: history.slice(0, 10),
  });
}