import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { POST as executeRemediation } from "../../remediate/route";


type Status =
  | "pending_approval"
  | "dry_run"
  | "approved"
  | "rejected";

type ApprovalRecord = {
  id: string;
  remediationId: string;
  groupId?: string;
  service: string;
  action: string;
  targetCount: number;
  risk: "low" | "medium" | "high";
  status: Status;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "remediation-approvals.json");
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

function readRecords(): ApprovalRecord[] {
  ensureStorage();

  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: ApprovalRecord[]) {
  ensureStorage();

  fs.writeFileSync(
    FILE,
    JSON.stringify(records, null, 2),
    "utf8"
  );
}

function appendAudit(entry: Record<string, unknown>) {
  ensureStorage();

  let records: Record<string, unknown>[] = [];

  try {
    const parsed = JSON.parse(fs.readFileSync(AUDIT_FILE, "utf8"));

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

export async function GET() {
  try {
    const approvals = readRecords();

    return NextResponse.json({
      success: true,
      approvals,
      summary: {
        total: approvals.length,
        pending: approvals.filter(
          (item) => item.status === "pending_approval"
        ).length,
        dryRun: approvals.filter(
          (item) => item.status === "dry_run"
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
    console.error("Remediation approval GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load remediation approvals",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const operation = String(body?.operation || "");
    const remediationId = String(body?.remediationId || "");
    const service = String(body?.service || "");
    const action = String(body?.action || "");
    const groupId = String(body?.groupId || "");
    const targetCount = Number(body?.targetCount || 0);

    const requestedRisk = String(body?.risk || "medium");

    const risk: "low" | "medium" | "high" =
      requestedRisk === "low" || requestedRisk === "high"
        ? requestedRisk
        : "medium";

    if (!remediationId) {
      return NextResponse.json(
        {
          success: false,
          error: "remediationId is required",
        },
        { status: 400 }
      );
    }

    const records = readRecords();
    const now = new Date().toISOString();

    let record = records.find(
      (item) => item.remediationId === remediationId
    );

    if (operation === "dry_run") {
      if (record) {
        record.status = "dry_run";
        record.updatedAt = now;
      } else {
        record = {
          id: `REM-APP-${Date.now()}`,
          remediationId,
          service,
          action,
          targetCount,
          risk,
          status: "dry_run",
          createdAt: now,
          updatedAt: now,
        };

        records.unshift(record);
      }

      writeRecords(records);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        remediationId,
        action,
        resource: `${service} (${targetCount} target${
          targetCount === 1 ? "" : "s"
        })`,
        status: "dry_run",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message: "Dry-run completed and audit event recorded.",
        approval: record,
        execution: {
          status: "not_executed",
          awsChanges: "none",
        },
      });
    }

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: "Run dry-run before changing remediation approval state.",
        },
        { status: 404 }
      );
    }

    if (operation === "approve") {
      if (record.status !== "dry_run") {
        return NextResponse.json(
          {
            success: false,
            error: "Only a completed dry-run can be approved.",
          },
          { status: 409 }
        );
      }

      record.status = "approved";
      if (groupId) {
        record.groupId = groupId;
      }
      record.updatedAt = now;
      record.approvedAt = now;

      writeRecords(records);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        remediationId: record.remediationId,
        action: record.action,
        resource: `${record.service} (${record.targetCount} target${
          record.targetCount === 1 ? "" : "s"
        })`,
        status: "approved",
        awsChanges: "none",
        timestamp: now,
      });

      if (!record.groupId) {
        return NextResponse.json({
          success: true,
          message:
            "Remediation approved. Execution is waiting for a verified security group target.",
          approval: record,
          execution: {
            status: "gated",
            awsChanges: "none",
          },
        });
      }

      const remediationAction =
        record.action === "remove-public-ssh"
          ? "remove-public-ssh"
          : record.action === "remove-public-rdp"
            ? "remove-public-rdp"
            : null;

      if (!remediationAction) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Approved remediation has no supported executable AWS action.",
          },
          { status: 409 }
        );
      }

      const executionRequest = new Request(
        new URL("/api/opsmind/remediate", request.url),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            groupId: record.groupId,
            action: remediationAction,
            dryRun: false,
          }),
        }
      );

      const executionResponse = await executeRemediation(
        executionRequest
      );

      const executionResult = await executionResponse.json();

      if (
        !executionResponse.ok ||
        !executionResult.success
      ) {
        appendAudit({
          id: `AUDIT-${Date.now()}`,
          remediationId: record.remediationId,
          action: record.action,
          resource: `${record.service} (${record.targetCount} target${
            record.targetCount === 1 ? "" : "s"
          })`,
          status: "execution_failed",
          awsChanges: "failed",
          timestamp: new Date().toISOString(),
          error:
            executionResult?.error ||
            "Remediation execution failed.",
        });

        return NextResponse.json(
          {
            success: false,
            message: "Remediation was approved but AWS execution failed.",
            approval: record,
            execution: {
              status: "failed",
              awsChanges: "none",
              result: executionResult,
            },
          },
          { status: 502 }
        );
      }

      record.updatedAt = new Date().toISOString();
      writeRecords(records);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        remediationId: record.remediationId,
        action: record.action,
        resource: `${record.service} (${record.targetCount} target${
          record.targetCount === 1 ? "" : "s"
        })`,
        status: "executed",
        awsChanges:
          executionResult.changed === true
            ? "applied"
            : "none",
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message:
          executionResult.message ||
          "Approved remediation executed successfully.",
        approval: record,
        execution: {
          status:
            executionResult.changed === true
              ? "executed"
              : "completed_no_change",
          awsChanges:
            executionResult.changed === true
              ? "applied"
              : "none",
          result: executionResult,
        },
      });
    }

    if (operation === "reject") {
      if (
        record.status !== "dry_run" &&
        record.status !== "pending_approval"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Only pending or dry-run remediations can be rejected.",
          },
          { status: 409 }
        );
      }

      record.status = "rejected";
      record.updatedAt = now;
      record.rejectedAt = now;

      writeRecords(records);

      appendAudit({
        id: `AUDIT-${Date.now()}`,
        remediationId: record.remediationId,
        action: record.action,
        resource: `${record.service} (${record.targetCount} target${
          record.targetCount === 1 ? "" : "s"
        })`,
        status: "rejected",
        awsChanges: "none",
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        message: "Remediation rejected.",
        approval: record,
        execution: {
          status: "blocked",
          awsChanges: "none",
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported remediation operation.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Remediation approval POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process remediation approval",
      },
      { status: 500 }
    );
  }
}