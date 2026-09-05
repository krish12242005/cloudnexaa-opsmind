import { NextResponse } from "next/server";
import { getRDSInstances } from "@/lib/aws/rds";

export async function GET() {
  try {
    const instances = await getRDSInstances();

    return NextResponse.json({
      success: true,
      count: instances.length,
      instances,
    });
  } catch (error) {
    console.error("AWS RDS error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch RDS instances",
      },
      { status: 500 }
    );
  }
}
