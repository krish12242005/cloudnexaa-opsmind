import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const FILE = path.join(process.cwd(), "data", "scan-history.json");

export async function GET() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const history = JSON.parse(raw);
    return NextResponse.json({
      success: true,
      history: Array.isArray(history) ? history : [],
    });
  } catch {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, "[]", "utf8");
    return NextResponse.json({ success: true, history: [] });
  }
}