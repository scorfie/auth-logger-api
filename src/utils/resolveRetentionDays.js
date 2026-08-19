const DEFAULT_RETENTION_DAYS = 30;

function resolveRetentionDays(override) {
  if (override !== undefined) {
    const n = Number(override);
    if (Number.isFinite(n)) return n;
  }

  const envValue = Number(process.env.RETENTION_DAYS);
  return Number.isFinite(envValue) ? envValue : DEFAULT_RETENTION_DAYS;
}

module.exports = resolveRetentionDays;
