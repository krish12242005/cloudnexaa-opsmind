import { NextResponse } from "next/server";
import {
  AuthorizeSecurityGroupIngressCommand,
  DescribeSecurityGroupsCommand,
  EC2Client,
  RevokeSecurityGroupIngressCommand,
} from "@aws-sdk/client-ec2";

const ec2 = new EC2Client({
  region: process.env.AWS_REGION || "ap-south-1",
});

type RemediationRequest = {
  groupId: string;
  action: "remove-public-ssh" | "remove-public-rdp";
  dryRun?: boolean;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as RemediationRequest;

    const { groupId, action, dryRun = true } = body;

    if (!groupId) {
      return NextResponse.json(
        {
          success: false,
          error: "Security Group ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      action !== "remove-public-ssh" &&
      action !== "remove-public-rdp"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported remediation action.",
        },
        { status: 400 }
      );
    }

    const securityGroups = await ec2.send(
      new DescribeSecurityGroupsCommand({
        GroupIds: [groupId],
      })
    );

    const group = securityGroups.SecurityGroups?.[0];

    if (!group) {
      return NextResponse.json(
        {
          success: false,
          error: "Security Group not found.",
        },
        { status: 404 }
      );
    }

    const targetPort =
      action === "remove-public-rdp" ? 3389 : 22;

    const matchingPermissions =
      (group.IpPermissions ?? []).filter((permission) => {
        const hasPublicAccess = (
          permission.IpRanges ?? []
        ).some(
          (range) => range.CidrIp === "0.0.0.0/0"
        );

        return (
          hasPublicAccess &&
          permission.FromPort === targetPort &&
          permission.ToPort === targetPort
        );
      });

    if (matchingPermissions.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        changed: false,
        message: `No public port ${targetPort} rule found.`,
        groupId,
        action,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        changed: false,
        message:
          "Remediation validated successfully. No AWS changes were made.",
        groupId,
        groupName: group.GroupName,
        action,
        targetPort,
        proposedRules: matchingPermissions,
      });
    }

    await ec2.send(
      new RevokeSecurityGroupIngressCommand({
        GroupId: groupId,
        IpPermissions: matchingPermissions,
      })
    );

    return NextResponse.json({
      success: true,
      dryRun: false,
      changed: true,
      message:
        `Public port ${targetPort} access was removed successfully.`,
      groupId,
      groupName: group.GroupName,
      action,
      targetPort,
    });
  } catch (error) {
    console.error("Remediation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Remediation execution failed.",
      },
      { status: 500 }
    );
  }
}
