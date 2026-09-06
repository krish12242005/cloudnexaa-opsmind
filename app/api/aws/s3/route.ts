import { isDemoMode } from "@/lib/opsmind/demo-mode";
import { DEMO_AWS_DATA } from "@/lib/opsmind/demo-data";
import { NextResponse } from "next/server";
import { getS3Buckets } from "@/lib/aws/s3";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({
      success: true,
      mode: "demo",
      count: DEMO_AWS_DATA.s3.count,
      buckets: DEMO_AWS_DATA.s3.buckets,
      data: DEMO_AWS_DATA.s3,
    });
  }

  try {
    const buckets = await getS3Buckets();

    return NextResponse.json({
      success: true,
      count: buckets.length,
      buckets,
    });
  } catch (error) {
    console.error("AWS S3 error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch S3 buckets",
      },
      { status: 500 }
    );
  }
}
