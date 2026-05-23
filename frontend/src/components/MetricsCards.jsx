function countBySeverity(findings = [], severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

export function MetricsCards({ findings = [] }) {
  const critical = countBySeverity(findings, "critical");
  const high = countBySeverity(findings, "high");
  const medium = countBySeverity(findings, "medium");
  const low = countBySeverity(findings, "low");

  const total = findings.length;

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <span>Total</span>
        <strong>{total}</strong>
      </div>

      <div className="metric-card">
        <span>Críticos</span>
        <strong className="score-critical">{critical}</strong>
      </div>

      <div className="metric-card">
        <span>Altos</span>
        <strong className="severity-high-text">{high}</strong>
      </div>

      <div className="metric-card">
        <span>Médios</span>
        <strong className="score-warning">{medium}</strong>
      </div>

      <div className="metric-card">
        <span>Baixos</span>
        <strong className="score-ok">{low}</strong>
      </div>
    </div>
  );
}