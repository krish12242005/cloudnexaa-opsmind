import { NextResponse } from "next/server";
import { getEC2Instances } from "@/lib/aws/ec2";

export async function GET() {
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
