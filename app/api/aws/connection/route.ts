import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "aws-connection.json");

type Connection = {
  connected: boolean;
  accountId: string | null;
  roleArn: string | null;
  region: string;
  access: "read-only";
  connectedAt: string | null;
  lastScan: string | null;
};

const defaultConnection: Connection = {
  connected: false,
  accountId: null,
  roleArn: null,
  region: process.env.AWS_REGION || "ap-south-1",
  access: "read-only",
  connectedAt: null,
  lastScan: null,
};

function readConnection(): Connection {
  try {
    if (!fs.existsSync(FILE)) {
      return defaultConnection;
    }

    return {
      ...defaultConnection,
      ...JSON.parse(fs.readFileSync(FILE, "utf8")),
    };
  } catch {
    return defaultConnection;
  }
}

function saveConnection(connection: Connection) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    FILE,
    JSON.stringify(connection, null, 2),
    "utf8"
  );
}

export async function GET() {
  return NextResponse.json({
    success: true,
    connection: readConnection(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const connection: Connection = {
      connected: Boolean(body?.connected),
      accountId: body?.accountId ?? null,
      roleArn: body?.roleArn ?? null,
      region: body?.region || process.env.AWS_REGION || "ap-south-1",
      access: "read-only",
      connectedAt: body?.connectedAt || new Date().toISOString(),
      lastScan: body?.lastScan || new Date().toISOString(),
    };

    saveConnection(connection);

    return NextResponse.json({
      success: true,
      connection,
    });
  } catch (error) {
    console.error("AWS connection storage error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to save AWS connection.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    saveConnection(defaultConnection);

    return NextResponse.json({
      success: true,
      connection: defaultConnection,
    });
  } catch (error) {
    console.error("AWS disconnect error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to disconnect AWS account.",
      },
      { status: 500 }
    );
  }
}
