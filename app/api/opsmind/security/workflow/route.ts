import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type SecurityStatus =
  | "open"
  | "acknowledged"
  | "resolved";

type SecurityRecord = {
  id: string;
  findingId: string;
  title: string;
  service: string;
  severity: string;
  resource?: string;
  status: SecurityStatus;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "security-workflow.json");
const AUDIT_FILE = path.join(DATA_DIR, "audit-log.json");

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, "[]", "utf8");
  }

  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, "[]", "utf8");
  }
}

function readRecords(): SecurityRecord[] {
  ensureStorage();

  try {
    const parsed = JSON.parse(
      fs.readFileSync(FILE, "utf8")
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: SecurityRecord[]) {
  ensureStorage();

  fs.writeFileSync(
    FILE,
    JSON.stringify(records, null, 2),
    "utf8"
  );
}

function appendAudit(entry: Record<string, unknown>) {
  ensureStorage();

  let entries: Record<string, unknown>[] = [];

  try {
    const parsed = JSON.parse(
      fs.readFileSync(AUDIT_FILE, "utf8")
    );

    if (Array.isArray(parsed)) {
      entries = parsed;
    }
  } catch {
    entries = [];
  }

  entries.unshift(entry);

  fs.writeFileSync(
    AUDIT_FILE,
    JSON.stringify(entries.slice(0, 500), null, 2),
    "utf8"
  );
}

export async function GET() {
  try {
    const findings = readRecords();

    return NextResponse.json({
      success: true,
      findings,
      summary: {
        total: findings.length,
        open: findings.filter(
          (item) => item.status === "open"
        ).length,
        acknowledged: findings.filter(
          (item) => item.status === "acknowledged"
        ).length,
        resolved: findings.filter(
          (item) => item.status === "resolved"
        ).length,
      },
    });
  } catch (error) {
    console.error(
      "Security workflow GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load security workflow state",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const operation = String(body?.operation || "");
    const findingId = String(body?.findingId || "");
    const title = String(
      body?.title || "Security finding"
    );
    const service = String(
      body?.service || "Security"
    );
    const severity = String(
      body?.severity || "warning"
    );
    const resource = body?.resource
      ? String(body.resource)
      : undefined;

    if (!findingId) {
      return NextResponse.json(
        {
          success: false,
          error: "findingId is required",
        },
        { status: 400 }
      );
    }

    const records = readRecords();
    const now = new Date().toISOString();

    let record = records.find(
      (item) => item.findingId === findingId
    );

    if (!record) {
      record = {
        id: `SEC-WF-${Date.now()}`,
        findingId,
        title,
        service,
        severity,
        resource,
        status: "open",
        createdAt: now,
        updatedAt: now,
      };

      records.unshift(record);
    }

    if (operation === "acknowledge") {
      if (record.status !== "open") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only open security findings can be acknowledged.",
          },
          { status: 409 }
        );
      }

      record.status = "acknowledged";
      record.updatedAt = now;
      record.acknowledgedAt = now;

      writeRecords(records);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        findingId,
        action: "Acknowledge security finding",
        resource:
          resource || `${service} - ${title}`,
        status: "acknowledged",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message:
          "Security finding acknowledged and audit event recorded.",
        finding: record,
      });
    }

    if (operation === "resolve") {
      if (
        record.status !== "open" &&
        record.status !== "acknowledged"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only open or acknowledged findings can be resolved.",
          },
          { status: 409 }
        );
      }

      record.status = "resolved";
      record.updatedAt = now;
      record.resolvedAt = now;

      writeRecords(records);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        findingId,
        action: "Resolve security finding",
        resource:
          resource || `${service} - ${title}`,
        status: "resolved",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message:
          "Security finding resolved and audit event recorded.",
        finding: record,
      });
    }

    if (operation === "reopen") {
      if (record.status !== "resolved") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only resolved findings can be reopened.",
          },
          { status: 409 }
        );
      }

      record.status = "open";
      record.updatedAt = now;
      delete record.resolvedAt;

      writeRecords(records);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        findingId,
        action: "Reopen security finding",
        resource:
          resource || `${service} - ${title}`,
        status: "reopened",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message: "Security finding reopened.",
        finding: record,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported security workflow operation.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Security workflow POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process security workflow",
      },
      { status: 500 }
    );
  }
}