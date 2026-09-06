import { isDemoMode } from "@/lib/opsmind/demo-mode";
import { DEMO_AWS_DATA } from "@/lib/opsmind/demo-data";
import { NextResponse } from "next/server";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({
      success: true,
      mode: "demo",
      currentMonthSpend: DEMO_AWS_DATA.cost.currentMonthSpend,
      projectedMonthSpend: DEMO_AWS_DATA.cost.projectedMonthSpend,
      currency: DEMO_AWS_DATA.cost.currency,
      cost: DEMO_AWS_DATA.cost,
      data: DEMO_AWS_DATA.cost,
    });
  }

  try {
    const client = new CostExplorerClient({
      region: "us-east-1",
    });

    const end = new Date();
    const start = new Date();
    start.setDate(1);

    const formatDate = (date: Date) =>
      date.toISOString().split("T")[0];

    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: formatDate(start),
        End: formatDate(end),
      },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
    });

    const result = await client.send(command);

    const totalCost =
      result.ResultsByTime?.reduce((sum, item) => {
        return (
          sum +
          Number(
            item.Total?.UnblendedCost?.Amount ?? 0
          )
        );
      }, 0) ?? 0;

    const dailyCosts =
      result.ResultsByTime?.map((item) => ({
        date: item.TimePeriod?.Start,
        cost: Number(
          item.Total?.UnblendedCost?.Amount ?? 0
        ),
      })) ?? [];

    return NextResponse.json({
      success: true,
      currency: "USD",
      period: {
        start: formatDate(start),
        end: formatDate(end),
      },
      totalCost: Number(totalCost.toFixed(2)),
      dailyCosts,
    });
  } catch (error) {
    console.error("AWS Cost Explorer error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load AWS cost data",
      },
      { status: 500 }
    );
  }
}
