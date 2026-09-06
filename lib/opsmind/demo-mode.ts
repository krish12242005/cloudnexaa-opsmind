import { DEMO_AWS_DATA } from "./demo-data";

export function isDemoMode(): boolean {
  return process.env.OPSMIND_DEMO_MODE === "true";
}

export function getOpsMindEnvironment() {
  if (isDemoMode()) {
    return {
      mode: "demo" as const,
      data: DEMO_AWS_DATA,
    };
  }

  return {
    mode: "live" as const,
    data: null,
  };
}
