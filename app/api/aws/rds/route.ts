import { isDemoMode } from "@/lib/opsmind/demo-mode";
import { DEMO_AWS_DATA } from "@/lib/opsmind/demo-data";
import { NextResponse } from "next/server";
import { getRDSInstances } from "@/lib/aws/rds";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({
      success: true,
      mode: "demo",
      count: DEMO_AWS_DATA.rds.count,
      databases: DEMO_AWS_DATA.rds.databases,
      data: DEMO_AWS_DATA.rds,
    });
  }

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
