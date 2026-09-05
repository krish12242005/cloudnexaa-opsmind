import { NextResponse } from "next/server";

const modules = [
  { id: "overview", label: "Overview", path: "/", category: "Workspace" },
  { id: "infrastructure", label: "Infrastructure", path: "/infrastructure", category: "Workspace" },
  { id: "observability", label: "Observability", path: "/observability", category: "Workspace" },
  { id: "incidents", label: "Incidents", path: "/incidents", category: "Workspace" },
  { id: "doctor", label: "Cloud Doctor", path: "/cloud-doctor", category: "Intelligence" },
  { id: "security", label: "Security", path: "/security", category: "Intelligence" },
  { id: "costs", label: "Cost Intelligence", path: "/costs", category: "Intelligence" },
  { id: "automation", label: "Automation", path: "/automation", category: "Intelligence" },
  { id: "remediation", label: "Remediation", path: "/remediation", category: "Intelligence" },
  { id: "kubernetes", label: "Kubernetes", path: "/kubernetes", category: "Platform" },
  { id: "devops", label: "DevOps", path: "/devops", category: "Platform" },
  { id: "audit", label: "Audit History", path: "/automation/history", category: "Platform" },
  { id: "assessment", label: "Project Assessment", path: "/assessment", category: "Platform" },
  { id: "scan", label: "Scan Center", path: "/scan", category: "Control" },
  { id: "settings", label: "AWS Settings", path: "/settings/aws", category: "Control" },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    region: process.env.AWS_REGION || "ap-south-1",
    modules,
    controls: {
      readOnlyScan: true,
      approvalRequired: true,
      destructiveActions: false,
      dryRunRemediation: true,
      auditTrail: true,
    },
  });
}