import { NextResponse } from "next/server";

type AnyObject = Record<string, any>;

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  try {
    const base =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const [overviewResponse, analysisResponse, costResponse] =
      await Promise.all([
        fetch(`${base}/api/aws/overview`, {
          cache: "no-store",
        }),
        fetch(`${base}/api/opsmind/analyze`, {
          cache: "no-store",
        }),
        fetch(`${base}/api/aws/costs`, {
          cache: "no-store",
        }),
      ]);

    const [overview, analysis, costs] = await Promise.all([
      overviewResponse.json().catch(() => ({})),
      analysisResponse.json().catch(() => ({})),
      costResponse.json().catch(() => ({})),
    ]);

    const ec2 =
      num(overview?.resources?.ec2?.count) ||
      num(overview?.ec2Count);

    const s3 =
      num(overview?.resources?.s3?.count) ||
      num(overview?.s3Count);

    const rds =
      num(overview?.resources?.rds?.count) ||
      num(overview?.rdsCount);

    const eks =
      num(overview?.resources?.eks?.count) ||
      num(overview?.eksCount);

    const vpc =
      num(overview?.resources?.vpc?.count) ||
      num(overview?.vpcCount);

    const totalResources =
      num(overview?.totalResources) ||
      ec2 + s3 + rds + eks + vpc;

    const critical =
      num(analysis?.summary?.critical);

    const warnings =
      num(analysis?.summary?.warnings);

    const healthy =
      num(analysis?.summary?.healthy);

    const info =
      num(analysis?.summary?.info);

    const findings =
      analysis?.findings || [];

    const totalFindings =
      num(analysis?.summary?.totalFindings) ||
      findings.length;

    const cost =
      num(costs?.totalCost) ||
      num(costs?.total) ||
      num(costs?.amount) ||
      num(costs?.cost);

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          critical * 30 -
          warnings * 10
      )
    );

    const riskSignals: {
      title: string;
      category: string;
      severity: string;
      detail: string;
      route: string;
    }[] = [];

    if (critical > 0) {
      riskSignals.push({
        title: `${critical} critical finding(s)`,
        category: "Security / Operations",
        severity: "critical",
        detail:
          "Critical findings require immediate investigation.",
        route: "/security",
      });
    }

    if (warnings > 0) {
      riskSignals.push({
        title: `${warnings} warning finding(s)`,
        category: "Operations",
        severity: "warning",
        detail:
          "Warning conditions should be reviewed before they affect workloads.",
        route: "/cloud-doctor",
      });
    }

    const stoppedInstances =
      overview?.resources?.ec2?.instances?.filter(
        (instance: AnyObject) =>
          instance?.State?.Name === "stopped"
      )?.length || 0;

    if (stoppedInstances > 0) {
      riskSignals.push({
        title: `${stoppedInstances} stopped EC2 instance(s)`,
        category: "FinOps",
        severity: "optimization",
        detail:
          "Stopped instances may indicate unused infrastructure or interrupted workloads.",
        route: "/automation",
      });
    }

    if (totalResources === 0) {
      riskSignals.push({
        title: "No cloud resources detected",
        category: "Infrastructure",
        severity: "info",
        detail:
          "Verify the connected AWS account, region and permissions.",
        route: "/settings/aws",
      });
    }

    const recommendations = [
      {
        title: "Run a full environment scan",
        reason:
          "Refresh infrastructure, security and operational intelligence.",
        priority: "high",
        route: "/scan",
      },
      {
        title: "Review security posture",
        reason:
          critical > 0 || warnings > 0
            ? "Active findings require investigation."
            : "Maintain continuous security visibility.",
        priority:
          critical > 0 ? "high" : "medium",
        route: "/security",
      },
      {
        title: "Inspect cost opportunities",
        reason:
          stoppedInstances > 0
            ? `${stoppedInstances} stopped EC2 instance(s) were detected.`
            : "Review current cloud spending and utilization.",
        priority:
          stoppedInstances > 0 ? "high" : "medium",
        route: "/costs",
      },
    ];

    return NextResponse.json({
      success: true,

      region:
        overview?.region ||
        process.env.AWS_REGION ||
        "ap-south-1",

      generatedAt:
        new Date().toISOString(),

      environment: {
        totalResources,
        ec2,
        s3,
        rds,
        eks,
        vpc,
      },

      health: {
        score: healthScore,
        critical,
        warnings,
        healthy,
        info,
      },

      findings: {
        total: totalFindings,
        preview: findings
          .slice(0, 6)
          .map((finding: AnyObject, index: number) => ({
            id:
              finding?.id ||
              `finding-${index}`,
            title:
              finding?.title ||
              "Infrastructure finding",
            service:
              finding?.service ||
              "OpsMind",
            severity:
              String(
                finding?.severity ||
                "info"
              ).toLowerCase(),
            description:
              finding?.description ||
              finding?.recommendation ||
              "Review recommended",
          })),
      },

      finance: {
        currentCost: cost,
        currency:
          costs?.currency ||
          "USD",
      },

      riskSignals,

      recommendations,
    });
  } catch (error) {
    console.error(
      "OpsMind Insights API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to generate OpsMind insights.",
      },
      {
        status: 500,
      }
    );
  }
}