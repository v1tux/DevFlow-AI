const METRIC_LABELS = {
  security: "Security",
  architecture: "Architecture",
  maintainability: "Maintainability",
  devops: "DevOps",
  quality: "Quality",
};

function normalizeScore(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function ScoreBar({ label, metric }) {
  const score = normalizeScore(metric?.score);
  const hasScore = score !== null;

  return (
    <div className="quality-item">
      <div className="quality-header">
        <span>{label}</span>
        <strong>{hasScore ? score : "N/A"}</strong>
      </div>

      <div className="quality-bar">
        <div
          className="quality-fill"
          style={{ width: `${hasScore ? score : 0}%` }}
        />
      </div>

      {metric && (
        <small className="muted">
          {metric.findings_count} achado(s) • Critical:{" "}
          {metric.severity?.critical ?? 0} • High:{" "}
          {metric.severity?.high ?? 0} • Medium:{" "}
          {metric.severity?.medium ?? 0} • Low: {metric.severity?.low ?? 0}
        </small>
      )}
    </div>
  );
}

export function QualityBreakdown({ metrics }) {
  const hasMetrics = metrics && Object.keys(metrics).length > 0;

  if (!hasMetrics) {
    return (
      <div className="card">
        <h2>Quality Breakdown</h2>
        <p className="muted">
          Métricas técnicas ainda não disponíveis para esta análise.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Quality Breakdown</h2>

      {Object.entries(METRIC_LABELS).map(([key, label]) => (
        <ScoreBar key={key} label={label} metric={metrics[key]} />
      ))}
    </div>
  );
}