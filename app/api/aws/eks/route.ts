import { isDemoMode } from "@/lib/opsmind/demo-mode";
import { DEMO_AWS_DATA } from "@/lib/opsmind/demo-data";
import { NextResponse } from "next/server";
import { getEKSClusters } from "@/lib/aws/eks";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({
      success: true,
      mode: "demo",
      count: DEMO_AWS_DATA.eks.count,
      clusters: DEMO_AWS_DATA.eks.clusters,
      data: DEMO_AWS_DATA.eks,
    });
  }

  try {
    const clusters = await getEKSClusters();

    return NextResponse.json({
      success: true,
      count: clusters.length,
      clusters,
    });
  } catch (error) {
    console.error("AWS EKS error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch EKS clusters",
      },
      { status: 500 }
    );
  }
}
