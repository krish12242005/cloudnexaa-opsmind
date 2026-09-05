import { NextRequest, NextResponse } from "next/server";
import {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  STSClient,
} from "@aws-sdk/client-sts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const accountId = String(body?.accountId ?? "").trim();
    const roleArn = String(body?.roleArn ?? "").trim();

    if (!/^\d{12}$/.test(accountId)) {
      return NextResponse.json(
        {
          success: false,
          error: "AWS Account ID must contain exactly 12 digits.",
        },
        { status: 400 }
      );
    }

    if (
      !roleArn.startsWith("arn:aws:iam::") ||
      !roleArn.includes(":role/")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid IAM Role ARN.",
        },
        { status: 400 }
      );
    }

    const arnAccountMatch = roleArn.match(
      /^arn:aws:iam::(\d{12}):role\//
    );

    if (!arnAccountMatch || arnAccountMatch[1] !== accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID does not match the IAM Role ARN.",
        },
        { status: 400 }
      );
    }

    const region = process.env.AWS_REGION || "ap-south-1";

    const sts = new STSClient({
      region,
    });

    const assumed = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `cloudnexaa-opsmind-${Date.now()}`,
        DurationSeconds: 900,
      })
    );

    if (
      !assumed.Credentials?.AccessKeyId ||
      !assumed.Credentials.SecretAccessKey ||
      !assumed.Credentials.SessionToken
    ) {
      throw new Error("AWS did not return temporary credentials.");
    }

    const connectedSTS = new STSClient({
      region,
      credentials: {
        accessKeyId: assumed.Credentials.AccessKeyId,
        secretAccessKey: assumed.Credentials.SecretAccessKey,
        sessionToken: assumed.Credentials.SessionToken,
      },
    });

    const identity = await connectedSTS.send(
      new GetCallerIdentityCommand({})
    );

    if (identity.Account !== accountId) {
      return NextResponse.json(
        {
          success: false,
          error: "AWS account verification failed.",
          verifiedAccount: identity.Account ?? null,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      provider: "AWS",
      accountId: identity.Account,
      roleArn,
      region,
      access: "read-only",
      credentialType: "temporary",
      expiresAt: assumed.Credentials.Expiration,
      message: "AWS IAM role verified successfully.",
    });
  } catch (error: unknown) {
    console.error("AWS connection verification failed:", error);

    const awsError =
      error && typeof error === "object"
        ? (error as {
            name?: string;
            message?: string;
          })
        : null;

    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: awsError?.name || "AWSConnectionVerificationError",
        errorDetails:
          awsError?.message || "Unable to verify AWS IAM role.",
      },
      { status: 500 }
    );
  }
}
