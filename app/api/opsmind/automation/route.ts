import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";

type AutomationAction = {
  id: string;
  service: string;
  action: string;
  targetCount: number;
  risk: "low" | "medium" | "high";
  status: "pending_approval" | "ready";
  description: string;
};

export async function GET() {
  try {
    const ec2 = await getEC2Instances();

    const stoppedEC2 = ec2.filter(
      (instance: any) => instance.State?.Name === "stopped"
    );

    const actions: AutomationAction[] = [];

    if (stoppedEC2.length > 0) {
      actions.push({
        id: "AUTO-EC2-001",
        service: "EC2",
        action: "Review stopped instances",
        targetCount: stoppedEC2.length,
        risk: "medium",
        status: "pending_approval",
        description:
          `${stoppedEC2.length} stopped EC2 instance(s) require review before any cleanup action.`,
      });
    }

    actions.push({
      id: "AUTO-EC2-002",
      service: "EC2",
      action: "Infrastructure health review",
      targetCount: ec2.length,
      risk: "low",
      status: "ready",
      description:
        "Review EC2 instance state, utilization and lifecycle before performing optimization.",
    });

    return NextResponse.json({
      success: true,
      region: process.env.AWS_REGION || "ap-south-1",

      summary: {
        totalActions: actions.length,
        pendingApproval: actions.filter(
          (action) => action.status === "pending_approval"
        ).length,
        ready: actions.filter(
          (action) => action.status === "ready"
        ).length,
      },

      actions,

      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("OpsMind Automation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to generate automation actions",
      },
      { status: 500 }
    );
  }
}
