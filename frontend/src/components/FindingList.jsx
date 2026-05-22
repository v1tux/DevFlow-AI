function getSeverityLabel(severity) {
  return {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Médio',
    low: 'Baixo',
  }[severity] || severity;
}

export function FindingList({ findings = [] }) {
  return (
    <div className="card">
      <h2>Achados técnicos</h2>

      {findings.length === 0 && <p>Nenhum achado ainda.</p>}

      {findings.map((finding, index) => (
        <div className="finding" key={`${finding.file}-${index}`}>
          <div className="finding-header">
            <span className={`severity severity-${finding.severity}`}>
              {getSeverityLabel(finding.severity)}
            </span>
            <span className="category">{finding.category}</span>
          </div>

          <strong>{finding.file || 'Projeto'}</strong>

          <p>{finding.message}</p>

          {finding.priority && (
            <p>
              <b>Prioridade:</b> {finding.priority}
            </p>
          )}

          <p>
            <b>Recomendação:</b> {finding.recommendation}
          </p>
        </div>
      ))}
    </div>
  );
}