import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type ApprovalStatus =
  | "pending_approval"
  | "validated"
  | "approved"
  | "rejected";

type ApprovalRecord = {
  id: string;
  automationId: string;
  action: string;
  service: string;
  targetCount: number;
  risk: "low" | "medium" | "high";
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const APPROVAL_FILE = path.join(DATA_DIR, "automation-approvals.json");
const AUDIT_FILE = path.join(DATA_DIR, "audit-log.json");

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(APPROVAL_FILE)) {
    fs.writeFileSync(APPROVAL_FILE, "[]", "utf8");
  }

  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, "[]", "utf8");
  }
}

function readApprovals(): ApprovalRecord[] {
  ensureStorage();

  try {
    const raw = fs.readFileSync(APPROVAL_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeApprovals(records: ApprovalRecord[]) {
  ensureStorage();
  fs.writeFileSync(
    APPROVAL_FILE,
    JSON.stringify(records, null, 2),
    "utf8"
  );
}

function appendAudit(entry: Record<string, unknown>) {
  ensureStorage();

  let records: Record<string, unknown>[] = [];

  try {
    const raw = fs.readFileSync(AUDIT_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      records = parsed;
    }
  } catch {
    records = [];
  }

  records.unshift(entry);

  fs.writeFileSync(
    AUDIT_FILE,
    JSON.stringify(records.slice(0, 500), null, 2),
    "utf8"
  );
}

function approvalId(automationId: string) {
  return `APP-${automationId}-${Date.now()}`;
}

export async function GET() {
  try {
    const approvals = readApprovals();

    return NextResponse.json({
      success: true,
      approvals,
      summary: {
        total: approvals.length,
        pending: approvals.filter(
          (item) => item.status === "pending_approval"
        ).length,
        validated: approvals.filter(
          (item) => item.status === "validated"
        ).length,
        approved: approvals.filter(
          (item) => item.status === "approved"
        ).length,
        rejected: approvals.filter(
          (item) => item.status === "rejected"
        ).length,
      },
    });
  } catch (error) {
    console.error("Automation approval GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load automation approvals",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const operation = String(body?.operation || "");
    const automationId = String(body?.automationId || "");
    const action = String(body?.action || "");
    const service = String(body?.service || "");
    const targetCount = Number(body?.targetCount || 0);
    const risk = String(body?.risk || "medium") as
      | "low"
      | "medium"
      | "high";

    if (!automationId) {
      return NextResponse.json(
        {
          success: false,
          error: "automationId is required",
        },
        { status: 400 }
      );
    }

    const approvals = readApprovals();

    if (operation === "validate") {
      const existing = approvals.find(
        (item) => item.automationId === automationId
      );

      const now = new Date().toISOString();

      if (existing) {
        existing.status = "validated";
        existing.updatedAt = now;

        writeApprovals(approvals);

        appendAudit({
          id: `AUDIT-${Date.now()}`,
          automationId,
          action,
          resource: `${service} (${targetCount} target${
            targetCount === 1 ? "" : "s"
          })`,
          status: "validated",
          awsChanges: "none",
          timestamp: now,
        });

        return NextResponse.json({
          success: true,
          message: "Action validated and audit event created.",
          approval: existing,
        });
      }

      const record: ApprovalRecord = {
        id: approvalId(automationId),
        automationId,
        action,
        service,
        targetCount,
        risk:
          risk === "low" || risk === "high" ? risk : "medium",
        status: "validated",
        createdAt: now,
        updatedAt: now,
      };

      approvals.unshift(record);
      writeApprovals(approvals);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        automationId,
        action,
        resource: `${service} (${targetCount} target${
          targetCount === 1 ? "" : "s"
        })`,
        status: "validated",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message: "Action validated and audit event created.",
        approval: record,
      });
    }

    const existing = approvals.find(
      (item) => item.automationId === automationId
    );

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Approval record not found. Validate the action first.",
        },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    if (operation === "approve") {
      if (existing.status !== "validated") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only validated actions can be approved.",
          },
          { status: 409 }
        );
      }

      existing.status = "approved";
      existing.updatedAt = now;
      existing.approvedAt = now;

      writeApprovals(approvals);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        automationId: existing.automationId,
        action: existing.action,
        resource: `${existing.service} (${existing.targetCount} target${
          existing.targetCount === 1 ? "" : "s"
        })`,
        status: "approved",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message:
          "Action approved. Execution remains gated and no AWS resource was modified.",
        approval: existing,
        execution: {
          status: "gated",
          awsChanges: "none",
        },
      });
    }

    if (operation === "reject") {
      if (
        existing.status !== "validated" &&
        existing.status !== "pending_approval"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only pending or validated actions can be rejected.",
          },
          { status: 409 }
        );
      }

      existing.status = "rejected";
      existing.updatedAt = now;
      existing.rejectedAt = now;

      writeApprovals(approvals);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        automationId: existing.automationId,
        action: existing.action,
        resource: `${existing.service} (${existing.targetCount} target${
          existing.targetCount === 1 ? "" : "s"
        })`,
        status: "rejected",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message: "Automation action rejected.",
        approval: existing,
        execution: {
          status: "blocked",
          awsChanges: "none",
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported approval operation.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Automation approval POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process automation approval",
      },
      { status: 500 }
    );
  }
}