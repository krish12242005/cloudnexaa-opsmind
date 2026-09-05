export function calculateSecurityScore(
  critical: number,
  warnings: number,
  healthy: number,
  info: number
) {
  const total =
    critical + warnings + healthy + info;

  if (total === 0) return 100;

  const riskPoints =
    critical * 30 +
    warnings * 12 +
    info * 2;

  const maximumRisk =
    total * 30;

  const score =
    100 - (riskPoints / maximumRisk) * 100;

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

