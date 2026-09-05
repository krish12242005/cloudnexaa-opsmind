import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type AuditEntry = {
  id: string;
  automationId: string;
  action: string;
  resource: string;
  status: "validated" | "failed";
  awsChanges: "none";
  timestamp: string;
};

const auditFile = path.join(process.cwd(), "data", "audit-log.json");

async function readAuditLog(): Promise<AuditEntry[]> {
  try {
    const content = await fs.readFile(auditFile, "utf8");
    const parsed = JSON.parse(content);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await fs.mkdir(path.dirname(auditFile), { recursive: true });
    await fs.writeFile(auditFile, "[]", "utf8");
    return [];
  }
}

async function writeAuditLog(entries: AuditEntry[]) {
  await fs.mkdir(path.dirname(auditFile), { recursive: true });

  await fs.writeFile(
    auditFile,
    JSON.stringify(entries, null, 2),
    "utf8"
  );
}

export async function GET() {
  try {
    const entries = await readAuditLog();

    return NextResponse.json({
      success: true,
      entries,
    });
  } catch (error) {
    console.error("Audit GET error:", error);

    return NextResponse.json(
      {
        success: false,
        entries: [],
        message: "Failed to read audit history.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const entries = await readAuditLog();

    const entry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      automationId: body.automationId ?? "UNKNOWN",
      action: body.action ?? "Unknown action",
      resource: body.resource ?? "Unknown resource",
      status: body.status === "failed" ? "failed" : "validated",
      awsChanges: "none",
      timestamp: new Date().toISOString(),
    };

    entries.unshift(entry);

    await writeAuditLog(entries);

    return NextResponse.json({
      success: true,
      entry,
      total: entries.length,
    });
  } catch (error) {
    console.error("Audit POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create audit entry.",
      },
      { status: 400 }
    );
  }
}
