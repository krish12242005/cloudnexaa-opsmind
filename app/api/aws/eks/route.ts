import { NextResponse } from "next/server";
import { getEKSClusters } from "@/lib/aws/eks";

export async function GET() {
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
