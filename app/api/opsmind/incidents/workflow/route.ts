import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type IncidentStatus =
  | "open"
  | "acknowledged"
  | "resolved";

type IncidentRecord = {
  id: string;
  incidentId: string;
  title: string;
  service: string;
  severity: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "incident-workflow.json");
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

function readRecords(): IncidentRecord[] {
  ensureStorage();

  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: IncidentRecord[]) {
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
    const incidents = readRecords();

    return NextResponse.json({
      success: true,
      incidents,
      summary: {
        total: incidents.length,
        open: incidents.filter(
          (item) => item.status === "open"
        ).length,
        acknowledged: incidents.filter(
          (item) => item.status === "acknowledged"
        ).length,
        resolved: incidents.filter(
          (item) => item.status === "resolved"
        ).length,
      },
    });
  } catch (error) {
    console.error("Incident workflow GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load incident workflow state",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const operation = String(body?.operation || "");
    const incidentId = String(body?.incidentId || "");
    const title = String(body?.title || "Incident");
    const service = String(body?.service || "OpsMind");
    const severity = String(body?.severity || "medium");

    if (!incidentId) {
      return NextResponse.json(
        {
          success: false,
          error: "incidentId is required",
        },
        { status: 400 }
      );
    }

    const records = readRecords();

    let record = records.find(
      (item) => item.incidentId === incidentId
    );

    const now = new Date().toISOString();

    if (!record) {
      record = {
        id: `INC-WF-${Date.now()}`,
        incidentId,
        title,
        service,
        severity,
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
              "Only open incidents can be acknowledged.",
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
        incidentId,
        action: "Acknowledge incident",
        resource: `${service} - ${title}`,
        status: "acknowledged",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message: "Incident acknowledged and audit event recorded.",
        incident: record,
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
              "Only open or acknowledged incidents can be resolved.",
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
        incidentId,
        action: "Resolve incident",
        resource: `${service} - ${title}`,
        status: "resolved",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message: "Incident resolved and audit event recorded.",
        incident: record,
      });
    }

    if (operation === "reopen") {
      if (record.status !== "resolved") {
        return NextResponse.json(
          {
            success: false,
            error: "Only resolved incidents can be reopened.",
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
        incidentId,
        action: "Reopen incident",
        resource: `${service} - ${title}`,
        status: "reopened",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message: "Incident reopened.",
        incident: record,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported incident operation.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Incident workflow POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process incident workflow",
      },
      { status: 500 }
    );
  }
}