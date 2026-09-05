import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();

function exists(relativePath: string) {
  const file = path.resolve(/* turbopackIgnore: true */ PROJECT_ROOT, relativePath);
  return fs.existsSync(file);
}

function read(relativePath: string) {
  const file = path.resolve(/* turbopackIgnore: true */ PROJECT_ROOT, relativePath);

  if (!fs.existsSync(file)) return "";

  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    const packageJson = read("package.json");

    let pkg: {
      name?: string;
      scripts?: Record<string, string>;
      packageManager?: string;
    } = {};

    try {
      pkg = JSON.parse(packageJson || "{}");
    } catch {
      pkg = {};
    }

    const checks = [
      {
        id: "git",
        name: "Git repository",
        passed: exists(".git"),
      },
      {
        id: "github-actions",
        name: "GitHub Actions",
        passed:
          exists(".github/workflows") ||
          exists(".github/workflows/ci.yml") ||
          exists(".github/workflows/cicd.yml"),
      },
      {
        id: "docker",
        name: "Docker",
        passed:
          exists("Dockerfile") ||
          exists("docker-compose.yml") ||
          exists("docker-compose.yaml"),
      },
      {
        id: "terraform",
        name: "Terraform",
        passed:
          exists("main.tf") ||
          exists("terraform") ||
          exists("infra"),
      },
      {
        id: "build",
        name: "Production build",
        passed: Boolean(pkg.scripts?.build),
      },
      {
        id: "lint",
        name: "Linting",
        passed: Boolean(pkg.scripts?.lint),
      },
      {
        id: "tests",
        name: "Tests",
        passed:
          Boolean(pkg.scripts?.test) ||
          exists("tests") ||
          exists("__tests__"),
      },
      {
        id: "env",
        name: "Environment template",
        passed:
          exists(".env.example") ||
          exists(".env.local.example"),
      },
    ];

    const passed = checks.filter((check) => check.passed).length;
    const total = checks.length;
    const score = Math.round((passed / total) * 100);

    let status = "Early Stage";

    if (score >= 90) {
      status = "Production Ready";
    } else if (score >= 70) {
      status = "Mostly Ready";
    } else if (score >= 50) {
      status = "Needs Attention";
    }

    return NextResponse.json({
      success: true,
      project: {
        name: pkg.name || "cloudnexaa-opsmind",
        framework: "Next.js",
        packageManager: pkg.packageManager || "npm",
      },
      readiness: {
        score,
        status,
        passed,
        total,
      },
      checks,
      scannedAt: new Date().toISOString(),
      note: "CI/CD readiness is based on local project configuration. It does not claim that a remote deployment or GitHub workflow has succeeded.",
    });
  } catch (error) {
    console.error("OpsMind DevOps error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to scan DevOps readiness",
      },
      { status: 500 }
    );
  }
}
