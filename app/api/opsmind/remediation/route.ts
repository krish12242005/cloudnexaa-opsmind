import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";

type Remediation = {
  id: string;
  service: string;
  action: string;
  targetCount: number;
  risk: "low" | "medium" | "high";
  mode: "dry-run";
  approvalRequired: boolean;
  status: "pending_approval";
  description: string;
};

export async function GET() {
  try {
    const ec2 = await getEC2Instances();

    const stoppedEC2 = ec2.filter(
      (instance) => instance.state === "stopped"
    );

    const remediations: Remediation[] = [];

    if (stoppedEC2.length > 0) {
      remediations.push({
        id: "REM-EC2-001",
        service: "EC2",
        action: "Review and clean unused stopped instances",
        targetCount: stoppedEC2.length,
        risk: "medium",
        mode: "dry-run",
        approvalRequired: true,
        status: "pending_approval",
        description:
          "OpsMind identified stopped EC2 instances. No AWS resources will be changed until authorized approval is provided.",
      });
    }

    return NextResponse.json({
      success: true,
      region: process.env.AWS_REGION || "ap-south-1",
      summary: {
        total: remediations.length,
        pendingApproval: remediations.filter(
          (item) => item.status === "pending_approval"
        ).length,
        dryRun: remediations.filter(
          (item) => item.mode === "dry-run"
        ).length,
      },
      remediations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("OpsMind Remediation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to generate remediation plan",
      },
      { status: 500 }
    );
  }
}
