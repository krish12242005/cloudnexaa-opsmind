import { NextResponse } from "next/server";
import { getS3Buckets } from "@/lib/aws/s3";

export async function GET() {
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
