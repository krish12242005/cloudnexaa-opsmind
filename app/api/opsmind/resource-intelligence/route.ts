import { NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function stateOf(resource: AnyRecord) {
  return String(
    resource?.State?.Name ||
    resource?.DBInstanceStatus ||
    resource?.status ||
    resource?.Status ||
    "unknown"
  ).toLowerCase();
}

function resourceName(resource: AnyRecord, fallback: string) {
  const tags = Array.isArray(resource?.Tags)
    ? resource.Tags
    : [];

  const nameTag = tags.find(
    (tag: AnyRecord) => tag?.Key === "Name"
  )?.Value;

  return (
    nameTag ||
    resource?.Name ||
    resource?.name ||
    resource?.InstanceId ||
    resource?.BucketName ||
    resource?.DBInstanceIdentifier ||
    resource?.ClusterName ||
    resource?.VpcId ||
    fallback
  );
}

function analyzeResource(
  resource: AnyRecord,
  service: string,
  index: number
) {
  const state = stateOf(resource);

  const publicExposure =
    resource?.PubliclyAccessible === true ||
    Boolean(resource?.PublicIpAddress);

  const encrypted =
    resource?.Encrypted;

  let risk: "low" | "medium" | "high" = "low";

  if (publicExposure) {
    risk = "high";
  } else if (
    state === "stopped" ||
    state === "inactive" ||
    encrypted === false
  ) {
    risk = "medium";
  }

  const signals: string[] = [];

  if (publicExposure) {
    signals.push("Public exposure detected");
  }

  if (state === "stopped") {
    signals.push("Stopped resource");
  }

  if (encrypted === false) {
    signals.push("Encryption not enabled");
  }

  if (signals.length === 0) {
    signals.push("No immediate risk signal");
  }

  return {
    id:
      resource?.InstanceId ||
      resource?.BucketName ||
      resource?.DBInstanceIdentifier ||
      resource?.ClusterName ||
      resource?.VpcId ||
      `${service.toLowerCase()}-${index}`,

    service,

    name: resourceName(
      resource,
      `${service} Resource ${index + 1}`
    ),

    state,

    risk,

    region:
      resource?.Placement?.AvailabilityZone ||
      resource?.AvailabilityZone ||
      resource?.Region ||
      "Unknown",

    endpoint:
      resource?.PublicIpAddress ||
      resource?.PrivateIpAddress ||
      resource?.Endpoint?.Address ||
      "Not available",

    signals,
  };
}

export async function GET() {
  try {
    const origin =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const [
      overviewResponse,
      analysisResponse,
      costResponse,
    ] = await Promise.all([
      fetch(`${origin}/api/aws/overview`, {
        cache: "no-store",
      }),
      fetch(`${origin}/api/opsmind/analyze`, {
        cache: "no-store",
      }),
      fetch(`${origin}/api/aws/costs`, {
        cache: "no-store",
      }),
    ]);

    const [
      overview,
      analysis,
      costs,
    ] = await Promise.all([
      overviewResponse.json().catch(() => ({})),
      analysisResponse.json().catch(() => ({})),
      costResponse.json().catch(() => ({})),
    ]);

    const resources =
      overview?.resources || {};

    const all = [];

    for (const resource of resources?.ec2?.instances || []) {
      all.push(
        analyzeResource(
          resource,
          "EC2",
          all.length
        )
      );
    }

    for (const resource of resources?.s3?.buckets || []) {
      all.push(
        analyzeResource(
          resource,
          "S3",
          all.length
        )
      );
    }

    for (const resource of resources?.rds?.instances || []) {
      all.push(
        analyzeResource(
          resource,
          "RDS",
          all.length
        )
      );
    }

    for (const resource of resources?.eks?.clusters || []) {
      all.push(
        analyzeResource(
          resource,
          "EKS",
          all.length
        )
      );
    }

    for (const resource of resources?.vpc?.vpcs || []) {
      all.push(
        analyzeResource(
          resource,
          "VPC",
          all.length
        )
      );
    }

    const highRisk =
      all.filter(
        (item) => item.risk === "high"
      ).length;

    const mediumRisk =
      all.filter(
        (item) => item.risk === "medium"
      ).length;

    const lowRisk =
      all.filter(
        (item) => item.risk === "low"
      ).length;

    const totalFindings =
      numberValue(
        analysis?.summary?.totalFindings
      ) ||
      numberValue(
        analysis?.findings?.length
      );

    return NextResponse.json({
      success: true,

      generatedAt:
        new Date().toISOString(),

      region:
        overview?.region ||
        process.env.AWS_REGION ||
        "ap-south-1",

      summary: {
        totalResources: all.length,
        highRisk,
        mediumRisk,
        lowRisk,
        totalFindings,

        currentCost:
          numberValue(costs?.totalCost) ||
          numberValue(costs?.total) ||
          numberValue(costs?.amount) ||
          numberValue(costs?.cost),

        currency:
          costs?.currency || "USD",
      },

      resources: all,
    });
  } catch (error) {
    console.error(
      "Resource intelligence error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to generate resource intelligence.",
      },
      { status: 500 }
    );
  }
}