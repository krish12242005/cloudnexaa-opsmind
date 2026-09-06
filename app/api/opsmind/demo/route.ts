import { NextResponse } from "next/server";
import { DEMO_AWS_DATA } from "@/lib/opsmind/demo-data";
import { isDemoMode } from "@/lib/opsmind/demo-mode";

export async function GET() {
  if (!isDemoMode()) {
    return NextResponse.json(
      {
        success: false,
        mode: "live",
        message: "Demo mode is disabled",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    mode: "demo",
    data: DEMO_AWS_DATA,
  });
}
