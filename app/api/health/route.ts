import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "cloudnexaa-opsmind",
    environment: "development",
    region: "ap-south-1",
    timestamp: new Date().toISOString(),
  });
}
