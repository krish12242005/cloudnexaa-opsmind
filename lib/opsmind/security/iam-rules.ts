import { User, Role } from "@aws-sdk/client-iam";

export type IAMFinding = {
  id: string;
  severity: "critical" | "warning" | "info" | "healthy";
  service: "IAM";
  title: string;
  description: string;
  recommendation: string;
  riskScore: number;
};

export function analyzeIAM(
  users: User[],
  roles: Role[]
): IAMFinding[] {
  const findings: IAMFinding[] = [];

  if (users.length === 0) {
    findings.push({
      id: "IAM-001",
      severity: "healthy",
      service: "IAM",
      title: "No IAM users detected",
      description:
        "No IAM users were returned by the connected AWS account.",
      recommendation:
        "Continue using role-based access and federated identity where possible.",
      riskScore: 0,
    });
  } else {
    findings.push({
      id: "IAM-001",
      severity: "info",
      service: "IAM",
      title: `${users.length} IAM user${users.length > 1 ? "s" : ""} detected`,
      description:
        "OpsMind discovered IAM users in the connected AWS account.",
      recommendation:
        "Review unused users, MFA configuration, access keys and permissions regularly.",
      riskScore: 10,
    });
  }

  if (roles.length === 0) {
    findings.push({
      id: "IAM-002",
      severity: "warning",
      service: "IAM",
      title: "No IAM roles detected",
      description:
        "No IAM roles were returned by the connected AWS account.",
      recommendation:
        "Verify IAM permissions and prefer IAM roles for workloads instead of long-lived credentials.",
      riskScore: 50,
    });
  } else {
    findings.push({
      id: "IAM-002",
      severity: "healthy",
      service: "IAM",
      title: `${roles.length} IAM role${roles.length > 1 ? "s" : ""} detected`,
      description:
        "OpsMind can inspect IAM role inventory in the connected AWS account.",
      recommendation:
        "Continue following least-privilege access and review unused roles periodically.",
      riskScore: 0,
    });
  }

  return findings;
}
