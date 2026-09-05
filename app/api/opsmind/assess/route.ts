import { NextRequest, NextResponse } from "next/server";

type AssessmentCheck = {
  id: string;
  area: string;
  status: "pass" | "warning" | "fail";
  score: number;
  title: string;
  detail: string;
  recommendation: string;
};

function parseGitHub(url: string) {
  const match = url.trim().match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)\/?$/
  );

  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repository = String(body?.repository ?? "").trim();
    const parsed = parseGitHub(repository);

    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a public GitHub repository URL like https://github.com/owner/repo",
        },
        { status: 400 }
      );
    }

    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "User-Agent": "Cloudnexaa-OpsMind",
    };

    const [repoResponse, workflowsResponse, languagesResponse] =
      await Promise.all([
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
          headers,
          cache: "no-store",
        }),
        fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/actions/workflows`,
          { headers, cache: "no-store" }
        ),
        fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`,
          { headers, cache: "no-store" }
        ),
      ]);

    if (!repoResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            repoResponse.status === 404
              ? "Repository not found or not publicly accessible."
              : `GitHub API error ${repoResponse.status}`,
        },
        { status: repoResponse.status }
      );
    }

    const repo = await repoResponse.json();
    const workflows = workflowsResponse.ok
      ? await workflowsResponse.json()
      : { total_count: 0, workflows: [] };
    const languages = languagesResponse.ok ? await languagesResponse.json() : {};

    const checks: AssessmentCheck[] = [];

    checks.push({
      id: "repo-documentation",
      area: "Engineering Quality",
      status: repo.description || repo.homepage ? "pass" : "warning",
      score: repo.description ? 15 : 8,
      title: "Repository presentation",
      detail: repo.description
        ? "Repository has a description."
        : "Repository description is missing.",
      recommendation:
        "Add a clear production-oriented README, architecture diagram and setup flow.",
    });

    checks.push({
      id: "activity",
      area: "Engineering Quality",
      status: repo.pushed_at ? "pass" : "warning",
      score: repo.pushed_at ? 15 : 8,
      title: "Repository activity",
      detail: repo.pushed_at
        ? `Latest push: ${repo.pushed_at}`
        : "No recent push metadata was returned.",
      recommendation:
        "Keep commits focused and maintain a clean, understandable project history.",
    });

    checks.push({
      id: "ci",
      area: "DevOps",
      status: workflows.total_count > 0 ? "pass" : "warning",
      score: workflows.total_count > 0 ? 15 : 7,
      title: "CI/CD workflow",
      detail:
        workflows.total_count > 0
          ? `${workflows.total_count} GitHub Actions workflow(s) detected.`
          : "No GitHub Actions workflows detected.",
      recommendation:
        "Use CI for lint, tests, builds and deployment validation.",
    });

    checks.push({
      id: "license",
      area: "Governance",
      status: repo.license ? "pass" : "warning",
      score: repo.license ? 10 : 5,
      title: "License metadata",
      detail: repo.license
        ? `${repo.license.spdx_id || "License"} detected.`
        : "No repository license metadata detected.",
      recommendation:
        "Add an appropriate license and document third-party dependencies.",
    });

    const languageNames = Object.keys(languages);

    checks.push({
      id: "stack",
      area: "Technology",
      status: languageNames.length > 0 ? "pass" : "warning",
      score: languageNames.length > 0 ? 15 : 7,
      title: "Technology visibility",
      detail:
        languageNames.length > 0
          ? languageNames.slice(0, 8).join(", ")
          : "Language metadata was not available.",
      recommendation:
        "Document the architecture, deployment target and major runtime dependencies.",
    });

    checks.push({
      id: "health",
      area: "Project Health",
      status:
        repo.archived || repo.disabled ? "fail" : repo.open_issues_count > 20 ? "warning" : "pass",
      score: repo.archived || repo.disabled ? 0 : repo.open_issues_count > 20 ? 6 : 15,
      title: "Project health signals",
      detail: repo.archived
        ? "Repository is archived."
        : `${repo.open_issues_count ?? 0} open issue(s) currently reported.`,
      recommendation:
        "Keep issues triaged and make release status clear to reviewers.",
    });

    const score = Math.min(
      100,
      checks.reduce((total, item) => total + item.score, 0)
    );

    return NextResponse.json({
      success: true,
      repository: {
        name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        defaultBranch: repo.default_branch,
        license: repo.license?.spdx_id ?? null,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        languages: languageNames,
      },
      score,
      rating:
        score >= 90 ? "Excellent" : score >= 75 ? "Strong" : score >= 60 ? "Needs Work" : "High Risk",
      checks,
      disclaimer:
        "This assessment uses public repository metadata and is not a security audit or penetration test.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Assessment failed",
      },
      { status: 500 }
    );
  }
}