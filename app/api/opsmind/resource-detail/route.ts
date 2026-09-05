import { NextRequest, NextResponse } from "next/server";

type RecordLike = Record<string, any>;

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function resourceId(resource: RecordLike) {
  return (
    resource?.InstanceId ||
    resource?.BucketName ||
    resource?.DBInstanceIdentifier ||
    resource?.ClusterName ||
    resource?.VpcId ||
    resource?.Id ||
    resource?.Name ||
    ""
  );
}

function resourceName(resource: RecordLike) {
  const tags = Array.isArray(resource?.Tags)
    ? resource.Tags
    : [];

  const nameTag = tags.find(
    (tag: RecordLike) =>
      tag?.Key === "Name"
  )?.Value;

  return (
    nameTag ||
    resource?.Name ||
    resource?.name ||
    resource?.BucketName ||
    resource?.DBInstanceIdentifier ||
    resource?.ClusterName ||
    resource?.InstanceId ||
    resource?.VpcId ||
    resource?.Id ||
    "AWS Resource"
  );
}

function resourceState(resource: RecordLike) {
  return (
    resource?.State?.Name ||
    resource?.DBInstanceStatus ||
    resource?.status ||
    resource?.Status ||
    "unknown"
  );
}

function resourceRegion(resource: RecordLike) {
  return (
    resource?.Placement?.AvailabilityZone ||
    resource?.AvailabilityZone ||
    resource?.Region ||
    "Unknown"
  );
}

function endpointOf(resource: RecordLike) {
  return (
    resource?.PublicIpAddress ||
    resource?.PrivateIpAddress ||
    resource?.Endpoint?.Address ||
    resource?.Endpoint ||
    "Not available"
  );
}

function signalsOf(resource: RecordLike) {
  const signals: string[] = [];

  const state = normalize(resourceState(resource));

  if (state === "stopped") {
    signals.push(
      "Stopped compute resource"
    );
  }

  if (
    resource?.PubliclyAccessible === true ||
    Boolean(resource?.PublicIpAddress)
  ) {
    signals.push(
      "Public exposure indicator"
    );
  }

  if (resource?.Encrypted === false) {
    signals.push(
      "Encryption disabled"
    );
  }

  if (
    Array.isArray(resource?.SecurityGroups) &&
    resource.SecurityGroups.length > 0
  ) {
    signals.push(
      `${resource.SecurityGroups.length} security group association(s)`
    );
  }

  if (signals.length === 0) {
    signals.push(
      "No immediate resource-level signal"
    );
  }

  return signals;
}

async function loadOverview(request: NextRequest) {
  const origin =
    request.nextUrl.origin;

  const response = await fetch(
    `${origin}/api/aws/overview`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "AWS overview request failed"
    );
  }

  return response.json();
}

async function findResource(
  overview: RecordLike,
  requestedId: string
) {
  const groups = [
    {
      service: "EC2",
      resources:
        overview?.resources?.ec2?.instances ||
        [],
    },
    {
      service: "S3",
      resources:
        overview?.resources?.s3?.buckets ||
        [],
    },
    {
      service: "RDS",
      resources:
        overview?.resources?.rds?.instances ||
        [],
    },
    {
      service: "EKS",
      resources:
        overview?.resources?.eks?.clusters ||
        [],
    },
    {
      service: "VPC",
      resources:
        overview?.resources?.vpc?.vpcs ||
        [],
    },
  ];

  for (const group of groups) {
    for (const resource of group.resources) {
      if (
        String(resourceId(resource)) ===
        requestedId
      ) {
        return {
          service: group.service,
          resource,
        };
      }
    }
  }

  return null;
}

export async function GET(
  request: NextRequest
) {
  try {
    const requestedId =
      request.nextUrl.searchParams.get(
        "id"
      ) || "";

    if (!requestedId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Resource id is required.",
        },
        { status: 400 }
      );
    }

    const overview =
      await loadOverview(request);

    const found =
      await findResource(
        overview,
        requestedId
      );

    if (!found) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Resource was not found in the connected AWS environment.",
        },
        { status: 404 }
      );
    }

    const { service, resource } =
      found;

    const state =
      resourceState(resource);

    const signals =
      signalsOf(resource);

    const highRisk =
      signals.some((signal) =>
        signal.toLowerCase().includes("public")
      );

    const stopped =
      normalize(state) === "stopped";

    const encrypted =
      resource?.Encrypted;

    const risk =
      highRisk
        ? "high"
        : stopped ||
            encrypted === false
          ? "medium"
          : "low";

    let recommendation =
      "No immediate action recommended.";

    if (highRisk) {
      recommendation =
        "Review public exposure and restrict access where appropriate.";
    } else if (stopped) {
      recommendation =
        "Review lifecycle requirements and determine whether this resource is still needed.";
    } else if (encrypted === false) {
      recommendation =
        "Review encryption configuration and organizational policy.";
    }

    return NextResponse.json({
      success: true,

      region:
        overview?.region ||
        process.env.AWS_REGION ||
        "ap-south-1",

      generatedAt:
        new Date().toISOString(),

      resource: {
        id: resourceId(resource),
        name: resourceName(resource),
        service,
        type:
          resource?.InstanceType ||
          resource?.Engine ||
          resource?.EngineVersion ||
          `${service} Resource`,
        state,
        region:
          resourceRegion(resource),
        endpoint:
          endpointOf(resource),
        risk,
        signals,
        recommendation,

        identifiers: {
          arn:
            resource?.Arn ||
            resource?.ARN ||
            null,
          id:
            resourceId(resource),
        },

        networking: {
          publicIp:
            resource?.PublicIpAddress ||
            null,
          privateIp:
            resource?.PrivateIpAddress ||
            null,
          securityGroups:
            Array.isArray(
              resource?.SecurityGroups
            )
              ? resource.SecurityGroups
              : [],
        },

        security: {
          encrypted:
            typeof encrypted ===
            "boolean"
              ? encrypted
              : null,
          publiclyAccessible:
            typeof resource?.PubliclyAccessible ===
            "boolean"
              ? resource.PubliclyAccessible
              : null,
        },

        raw: resource,
      },
    });
  } catch (error) {
    console.error(
      "Resource detail API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load resource details.",
      },
      { status: 500 }
    );
  }
}