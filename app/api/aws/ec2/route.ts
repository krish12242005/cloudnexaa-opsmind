import { isDemoMode } from "@/lib/opsmind/demo-mode";
import { DEMO_AWS_DATA } from "@/lib/opsmind/demo-data";
import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({
      success: true,
      mode: "demo",
      count: DEMO_AWS_DATA.ec2.count,
      instances: DEMO_AWS_DATA.ec2.instances,
      data: DEMO_AWS_DATA.ec2,
    });
  }

  try {
    const instances = await getEC2Instances();

    return NextResponse.json({
      success: true,
      count: instances.length,
      instances,
    });
  } catch (error) {
    console.error("AWS EC2 error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch EC2 instances",
      },
      { status: 500 }
    );
  }
}
