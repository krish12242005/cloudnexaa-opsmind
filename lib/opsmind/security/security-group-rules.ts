import { SecurityGroup } from "@aws-sdk/client-ec2";

export function analyzeSecurityGroups(
  groups: SecurityGroup[]
) {
  return groups.flatMap((group) => {
    const publicPermissions = (group.IpPermissions ?? []).filter(
      (permission) =>
        (permission.IpRanges ?? []).some(
          (range) => range.CidrIp === "0.0.0.0/0"
        )
    );

    if (publicPermissions.length === 0) {
      return [];
    }

    const ports = publicPermissions.flatMap((permission) => {
      if (
        permission.FromPort === undefined ||
        permission.ToPort === undefined
      ) {
        return ["all"];
      }

      const result: string[] = [];

      for (
        let port = permission.FromPort;
        port <= permission.ToPort;
        port++
      ) {
        result.push(String(port));

        if (result.length > 100) {
          return ["all"];
        }
      }

      return result;
    });

    const uniquePorts = [...new Set(ports)];

    const hasAllPorts = uniquePorts.includes("all");
    const hasRdp = uniquePorts.includes("3389");
    const hasSsh = uniquePorts.includes("22");
    const hasWebOnly = uniquePorts.every(
      (port) => port === "80" || port === "443"
    );

    let severity: "critical" | "warning" | "info";

    let riskScore: number;

    if (hasAllPorts || hasRdp) {
      severity = "critical";
      riskScore = 95;
    } else if (hasSsh) {
      severity = "warning";
      riskScore = 75;
    } else if (hasWebOnly) {
      severity = "info";
      riskScore = 25;
    } else {
      severity = "warning";
      riskScore = 60;
    }

    let recommendation =
      "Restrict inbound access to trusted IP ranges and private networking where possible.";

    if (hasRdp) {
      recommendation =
        "CRITICAL: Remove public RDP exposure. Restrict port 3389 to trusted IPs or use a private access mechanism such as AWS Systems Manager.";
    } else if (hasSsh) {
      recommendation =
        "Restrict SSH port 22 to trusted administrator IPs. Avoid exposing SSH directly to the public internet.";
    } else if (hasWebOnly) {
      recommendation =
        "HTTP/HTTPS public access may be expected for web applications. Ensure only required web ports are exposed and enforce HTTPS where possible.";
    }

    return [
      {
        id: `SG-${group.GroupId}`,
        severity,
        service: "Security Group",
        title:
          severity === "critical"
            ? "Critical public exposure detected"
            : severity === "warning"
            ? "Public administrative access detected"
            : "Public web access detected",
        description: `${group.GroupName ?? "Security Group"} allows inbound traffic from 0.0.0.0/0 on ${uniquePorts.join(", ")}.`,
        recommendation,
        groupId: group.GroupId,
        riskScore,
      },
    ];
  });
}
