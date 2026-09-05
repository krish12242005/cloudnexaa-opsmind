import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";
import { getRDSInstances } from "@/lib/aws/rds";
import { getEKSClusters } from "@/lib/aws/eks";

export async function GET() {
  try {
    const [ec2, rds, eks] = await Promise.all([
      getEC2Instances(),
      getRDSInstances(),
      getEKSClusters(),
    ]);

    const runningEC2 = ec2.filter(
      (instance: any) => instance.State?.Name === "running"
    );

    const stoppedEC2 = ec2.filter(
      (instance: any) => instance.State?.Name === "stopped"
    );

    const observations = [
      {
        service: "EC2",
        status: runningEC2.length > 0 ? "healthy" : "warning",
        total: ec2.length,
        running: runningEC2.length,
        stopped: stoppedEC2.length,
        message:
          runningEC2.length > 0
            ? `${runningEC2.length} EC2 instance(s) currently running`
            : "No running EC2 instances detected",
      },
      {
        service: "RDS",
        status: rds.length > 0 ? "healthy" : "info",
        total: rds.length,
        message:
          rds.length > 0
            ? `${rds.length} RDS database(s) detected`
            : "No RDS databases detected",
      },
      {
        service: "EKS",
        status: eks.length > 0 ? "healthy" : "info",
        total: eks.length,
        message:
          eks.length > 0
            ? `${eks.length} EKS cluster(s) detected`
            : "No EKS clusters detected",
      },
    ];

    const warnings = observations.filter(
      (item) => item.status === "warning"
    ).length;

    const healthy = observations.filter(
      (item) => item.status === "healthy"
    ).length;

    const score = Math.max(
      0,
      Math.min(100, 100 - warnings * 25)
    );

    return NextResponse.json({
      success: true,
      region: process.env.AWS_REGION || "ap-south-1",

      summary: {
        score,
        status:
          score >= 90
            ? "Healthy"
            : score >= 70
              ? "Needs Attention"
              : "Critical",
        services: observations.length,
        healthy,
        warnings,
      },

      observations,

      collectedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("OpsMind Observability error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to collect observability data",
      },
      { status: 500 }
    );
  }
}
