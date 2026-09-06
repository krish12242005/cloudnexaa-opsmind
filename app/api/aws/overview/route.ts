import { DEMO_AWS_DATA } from "@/lib/opsmind/demo-data";
import { isDemoMode } from "@/lib/opsmind/demo-mode";
import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";
import { getS3Buckets } from "@/lib/aws/s3";
import { getRDSInstances } from "@/lib/aws/rds";
import { getEKSClusters } from "@/lib/aws/eks";

export async function GET() {
    if (isDemoMode()) {
    return NextResponse.json({
      success: true,
      mode: "demo",
      environment: DEMO_AWS_DATA.environment,
      resources: {
        ec2: DEMO_AWS_DATA.ec2.count,
        s3: DEMO_AWS_DATA.s3.count,
        rds: DEMO_AWS_DATA.rds.count,
        eks: DEMO_AWS_DATA.eks.count,
        total:
          DEMO_AWS_DATA.ec2.count +
          DEMO_AWS_DATA.s3.count +
          DEMO_AWS_DATA.rds.count +
          DEMO_AWS_DATA.eks.count,
      },
      ec2: DEMO_AWS_DATA.ec2,
      s3: DEMO_AWS_DATA.s3,
      rds: DEMO_AWS_DATA.rds,
      eks: DEMO_AWS_DATA.eks,
      findings: DEMO_AWS_DATA.findings,
      cost: DEMO_AWS_DATA.cost,
      opsmind: DEMO_AWS_DATA.opsmind,
    });
  }
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
