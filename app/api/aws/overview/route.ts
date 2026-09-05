import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";
import { getS3Buckets } from "@/lib/aws/s3";
import { getRDSInstances } from "@/lib/aws/rds";
import { getEKSClusters } from "@/lib/aws/eks";

export async function GET() {
  try {
    const [ec2, s3, rds, eks] = await Promise.all([
      getEC2Instances(),
      getS3Buckets(),
      getRDSInstances(),
      getEKSClusters(),
    ]);

    return NextResponse.json({
      success: true,
      region: process.env.AWS_REGION || "ap-south-1",
      resources: {
        ec2: {
          count: ec2.length,
          instances: ec2,
        },
        s3: {
          count: s3.length,
          buckets: s3,
        },
        rds: {
          count: rds.length,
          instances: rds,
        },
        eks: {
          count: eks.length,
          clusters: eks,
        },
      },
      summary: {
        totalResources:
          ec2.length + s3.length + rds.length + eks.length,
      },
    });
  } catch (error) {
    console.error("AWS overview error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch AWS infrastructure overview",
      },
      { status: 500 }
    );
  }
}
