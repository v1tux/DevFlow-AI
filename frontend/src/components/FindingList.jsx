function getSeverityLabel(severity) {
  return {
    critical: "Crítico",
    high: "Alto",
    medium: "Médio",
    low: "Baixo",
  }[severity] || severity || "N/A";
}

function getConfidenceLabel(confidence) {
  return {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
  }[confidence] || confidence || "Não informada";
}

function getSourceLabel(source) {
  return {
    static_check: "Análise estática",
    secret_detector: "Detector de segredos",
    sensitive_field_detector: "Detector de campo sensível",
    bandit: "Scanner de segurança",
    complexity: "Complexidade de código",
  }[source] || source || "Análise técnica";
}

function formatCategory(category) {
  if (!category) return "Geral";

  return category
    .replace("_", " ")
    .replace("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function FindingList({ findings = [] }) {
  const visibleFindings = findings.filter(
    (finding) => finding.category || finding.message
  );

  return (
    <div className="card">
      <h2>Achados técnicos</h2>

      {visibleFindings.length === 0 && <p>Nenhum achado ainda.</p>}

      {visibleFindings.map((finding, index) => (
        <div className="finding" key={`${finding.file}-${finding.message}-${index}`}>
          <div className="finding-header">
            <span className={`severity severity-${finding.severity}`}>
              {getSeverityLabel(finding.severity)}
            </span>

            <span className="category">{formatCategory(finding.category)}</span>
          </div>

          <strong>{finding.file || "Projeto"}</strong>

          <p>{finding.message}</p>

          <div className="finding-meta">
            {finding.confidence && (
              <span>
                <b>Confiança:</b> {getConfidenceLabel(finding.confidence)}
              </span>
            )}

            {finding.source && (
              <span>
                <b>Origem:</b> {getSourceLabel(finding.source)}
              </span>
            )}
          </div>

          {finding.evidence && (
            <div className="finding-detail">
              <b>Evidência:</b>
              <p>{finding.evidence}</p>
            </div>
          )}

          {finding.priority && (
            <p>
              <b>Prioridade:</b> {finding.priority}
            </p>
          )}

          {finding.recommendation && (
            <p>
              <b>Recomendação:</b> {finding.recommendation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}