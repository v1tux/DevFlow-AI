import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  ShieldAlert,
  X,
} from "lucide-react";
import { FindingList } from "./FindingList";
import { ImprovementRoadmap } from "./ImprovementRoadmap";

function getStatus(score) {
  if (score === null || score === undefined) {
    return { label: "Sem análise", className: "neutral" };
  }

  if (score >= 85) return { label: "Excelente", className: "excellent" };
  if (score >= 70) return { label: "Muito bom", className: "good" };
  if (score >= 50) return { label: "Com achados", className: "warning" };

  return { label: "Requer atenção", className: "critical" };
}

function formatDate(date) {
  if (!date) return "--/--/----";

  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getRepositoryPath(repositoryUrl) {
  if (!repositoryUrl) return "Análise enviada por ZIP";

  try {
    const url = new URL(repositoryUrl);
    return `${url.host}${url.pathname.replace(/\.git$/, "")}`;
  } catch (_) {
    return repositoryUrl;
  }
}

function getMetricScore(metrics, key) {
  return metrics?.[key]?.score ?? 0;
}

export function AnalysisDetailPanel({
  analysis,
  onClose,
  onLoadAnalysis,
  onDownloadReport,
}) {
  if (!analysis) {
    return null;
  }

  const status = getStatus(analysis.score);
  const metrics = analysis.metrics || {};
  const findings = analysis.findings || [];
  const visibleFindings = findings.filter(
    (finding) => finding.category || finding.message
  );

  const metricItems = [
    {
      key: "architecture",
      label: "Arquitetura",
      value: getMetricScore(metrics, "architecture"),
    },
    {
      key: "maintainability",
      label: "Manutenibilidade",
      value: getMetricScore(metrics, "maintainability"),
    },
    {
      key: "security",
      label: "Segurança",
      value: getMetricScore(metrics, "security"),
    },
    {
      key: "devops",
      label: "DevOps",
      value: getMetricScore(metrics, "devops"),
    },
    {
      key: "quality",
      label: "Qualidade",
      value: getMetricScore(metrics, "quality"),
    },
  ];

  return (
    <div className="analysis-detail-overlay">
      <aside className="analysis-detail-panel">
        <div className="analysis-detail-header">
          <div>
            <span className="detail-eyebrow">Detalhe da análise</span>
            <h2>{analysis.project_name}</h2>
            <p>{getRepositoryPath(analysis.repository_url)}</p>
          </div>

          <button type="button" className="detail-close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="analysis-detail-score-card">
          <div>
            <span>Score técnico</span>
            <strong className={status.className}>{analysis.score ?? "--"}</strong>
            <p>{status.label}</p>
          </div>

          <div className={`detail-score-ring ${status.className}`}>
            <span>{analysis.score ?? "--"}</span>
          </div>
        </div>

        <div className="analysis-detail-meta">
          <div>
            <Calendar size={16} />
            <span>{formatDate(analysis.created_at)}</span>
          </div>

          <div>
            <GitBranch size={16} />
            <span>{analysis.repository_url ? "GitHub" : "Upload ZIP"}</span>
          </div>

          <div>
            <ShieldAlert size={16} />
            <span>{visibleFindings.length} achado(s)</span>
          </div>
        </div>

        <div className="analysis-detail-actions">
          <button
            type="button"
            className="primary-button compact"
            onClick={() => onLoadAnalysis(analysis)}
          >
            <ExternalLink size={16} />
            Carregar no dashboard
          </button>

          <button
            type="button"
            className="outline-button compact"
            onClick={() => onDownloadReport(analysis.id)}
          >
            <Download size={16} />
            Baixar PDF
          </button>
        </div>

        <section className="analysis-detail-section">
          <div className="detail-section-title">
            <FileText size={18} />
            <h3>Resumo executivo</h3>
          </div>

          <p className="analysis-detail-summary">
            {analysis.summary || "Nenhum resumo disponível para esta análise."}
          </p>
        </section>

        <ImprovementRoadmap roadmap={analysis.improvement_roadmap || []} />

        <section className="analysis-detail-section">
          <div className="detail-section-title">
            <ShieldAlert size={18} />
            <h3>Métricas técnicas</h3>
          </div>

          <div className="detail-metrics-grid">
            {metricItems.map((metric) => (
              <article key={metric.key}>
                <span>{metric.label}</span>
                <strong>{metric.value}/100</strong>
                <div className="detail-metric-bar">
                  <i style={{ width: `${metric.value}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="analysis-detail-section">
          <div className="detail-section-title">
            <ShieldAlert size={18} />
            <h3>Achados técnicos</h3>
          </div>

          {visibleFindings.length > 0 ? (
            <FindingList findings={visibleFindings} />
          ) : (
            <div className="empty-state">
              <p>Nenhum achado técnico relevante encontrado.</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}