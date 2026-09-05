import { NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

function idOf(resource: AnyRecord) {
  return (
    resource?.InstanceId ||
    resource?.BucketName ||
    resource?.DBInstanceIdentifier ||
    resource?.ClusterName ||
    resource?.VpcId ||
    resource?.Id ||
    resource?.Name ||
    "unknown-resource"
  );
}

function nameOf(resource: AnyRecord) {
  const tags = Array.isArray(resource?.Tags)
    ? resource.Tags
    : [];

  const nameTag =
    tags.find(
      (tag: AnyRecord) => tag?.Key === "Name"
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
    idOf(resource)
  );
}

function addFinding(
  findings: AnyRecord[],
  item: AnyRecord
) {
  findings.push({
    id: item.id,
    service: item.service,
    resourceId: item.resourceId,
    resourceName: item.resourceName,
    category: item.category,
    severity: item.severity,
    title: item.title,
    description: item.description,
    recommendation: item.recommendation,
  });
}

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;

    const response = await fetch(
      `${origin}/api/aws/overview`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("AWS overview unavailable");
    }

    const overview =
      await response.json();

    const resources =
      overview?.resources || {};

    const findings: AnyRecord[] = [];

    const ec2 =
      resources?.ec2?.instances || [];

    const s3 =
      resources?.s3?.buckets || [];

    const rds =
      resources?.rds?.instances || [];

    const eks =
      resources?.eks?.clusters || [];

    for (
      let index = 0;
      index < ec2.length;
      index++
    ) {
      const instance = ec2[index];

      const id = idOf(instance);
      const name = nameOf(instance);

      if (
        instance?.PublicIpAddress ||
        instance?.PubliclyAccessible === true
      ) {
        addFinding(findings, {
          id: `SEC-EC2-PUBLIC-${index}`,
          service: "EC2",
          resourceId: id,
          resourceName: name,
          category: "Network Exposure",
          severity: "high",
          title: "EC2 public exposure indicator",
          description:
            "This EC2 resource reports a public network exposure indicator.",
          recommendation:
            "Review whether public exposure is required and restrict access where appropriate.",
        });
      }

      if (
        instance?.Encrypted === false
      ) {
        addFinding(findings, {
          id: `SEC-EC2-ENC-${index}`,
          service: "EC2",
          resourceId: id,
          resourceName: name,
          category: "Data Protection",
          severity: "medium",
          title: "Encryption indicator disabled",
          description:
            "The available resource data reports encryption as disabled.",
          recommendation:
            "Review encryption requirements and organizational policy.",
        });
      }
    }

    for (
      let index = 0;
      index < s3.length;
      index++
    ) {
      const bucket = s3[index];

      const name = nameOf(bucket);

      const publicState =
        bucket?.PublicAccessBlockConfiguration;

      if (
        bucket?.Public === true ||
        bucket?.IsPublic === true ||
        bucket?.PublicAccess === true
      ) {
        addFinding(findings, {
          id: `SEC-S3-PUBLIC-${index}`,
          service: "S3",
          resourceId: idOf(bucket),
          resourceName: name,
          category: "Storage Exposure",
          severity: "high",
          title: "S3 public exposure indicator",
          description:
            "The available bucket data indicates possible public access.",
          recommendation:
            "Review bucket policy and public access controls.",
        });
      }

      if (
        publicState &&
        publicState.BlockPublicAcls === false
      ) {
        addFinding(findings, {
          id: `SEC-S3-PAB-${index}`,
          service: "S3",
          resourceId: idOf(bucket),
          resourceName: name,
          category: "Storage Protection",
          severity: "medium",
          title: "S3 public access block review",
          description:
            "PublicAccessBlock data indicates that public ACL blocking is disabled.",
          recommendation:
            "Review S3 Public Access Block configuration.",
        });
      }
    }

    for (
      let index = 0;
      index < rds.length;
      index++
    ) {
      const database = rds[index];

      if (
        database?.PubliclyAccessible === true
      ) {
        addFinding(findings, {
          id: `SEC-RDS-PUBLIC-${index}`,
          service: "RDS",
          resourceId: idOf(database),
          resourceName: nameOf(database),
          category: "Database Exposure",
          severity: "high",
          title: "RDS publicly accessible",
          description:
            "The available RDS data reports the database as publicly accessible.",
          recommendation:
            "Review database network accessibility and restrict exposure where appropriate.",
        });
      }

      if (
        database?.StorageEncrypted === false ||
        database?.Encrypted === false
      ) {
        addFinding(findings, {
          id: `SEC-RDS-ENC-${index}`,
          service: "RDS",
          resourceId: idOf(database),
          resourceName: nameOf(database),
          category: "Data Protection",
          severity: "medium",
          title: "RDS encryption review",
          description:
            "The available RDS resource data reports encryption as disabled.",
          recommendation:
            "Review storage encryption requirements.",
        });
      }
    }

    for (
      let index = 0;
      index < eks.length;
      index++
    ) {
      const cluster = eks[index];

      if (
        cluster?.ResourcesVpcConfig?.EndpointPublicAccess === true
      ) {
        addFinding(findings, {
          id: `SEC-EKS-ENDPOINT-${index}`,
          service: "EKS",
          resourceId: idOf(cluster),
          resourceName: nameOf(cluster),
          category: "Cluster Exposure",
          severity: "medium",
          title: "EKS public endpoint enabled",
          description:
            "The available EKS configuration reports public endpoint access.",
          recommendation:
            "Review EKS endpoint access requirements and private/public configuration.",
        });
      }
    }

    const high =
      findings.filter(
        (item) => item.severity === "high"
      ).length;

    const medium =
      findings.filter(
        (item) => item.severity === "medium"
      ).length;

    const low =
      findings.filter(
        (item) => item.severity === "low"
      ).length;

    return NextResponse.json({
      success: true,

      region:
        overview?.region ||
        process.env.AWS_REGION ||
        "ap-south-1",

      generatedAt:
        new Date().toISOString(),

      summary: {
        total: findings.length,
        high,
        medium,
        low,
        posture:
          high > 0
            ? "Attention required"
            : medium > 0
              ? "Review recommended"
              : "No detected exposure signals",
      },

      findings,
    });
  } catch (error) {
    console.error(
      "Security exposure API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to analyze security exposure.",
      },
      { status: 500 }
    );
  }
}