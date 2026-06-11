import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react";

function formatCategory(category) {
  const labels = {
    security: "Segurança",
    architecture: "Arquitetura",
    maintainability: "Manutenibilidade",
    devops: "DevOps",
    quality: "Qualidade",
  };

  return labels[category] || "Qualidade";
}

function formatImpact(impact) {
  const labels = {
    high: "Alto impacto",
    medium: "Médio impacto",
    low: "Baixo impacto",
  };

  return labels[impact] || "Impacto não informado";
}

function formatEffort(effort) {
  const labels = {
    high: "Alto esforço",
    medium: "Médio esforço",
    low: "Baixo esforço",
  };

  return labels[effort] || "Esforço não informado";
}

function getCategoryIcon(category) {
  const icons = {
    security: <Shield size={18} />,
    architecture: <Gauge size={18} />,
    maintainability: <Wrench size={18} />,
    devops: <Sparkles size={18} />,
    quality: <CheckCircle2 size={18} />,
  };

  return icons[category] || <AlertTriangle size={18} />;
}

export function ImprovementRoadmap({ roadmap = [] }) {
  if (!roadmap.length) {
    return (
      <section className="panel improvement-roadmap-panel">
        <div className="panel-title">
          <h2>Plano de Melhoria</h2>
        </div>

        <div className="empty-state">
          <p>Execute uma análise para gerar um plano de melhoria técnico.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel improvement-roadmap-panel">
      <div className="panel-title">
        <h2>Plano de Melhoria</h2>
        <span className="roadmap-count">{roadmap.length} prioridade(s)</span>
      </div>

      <div className="roadmap-list">
        {roadmap.map((item) => (
          <article className="roadmap-card" key={`${item.priority}-${item.title}`}>
            <div className="roadmap-priority">
              <span>#{item.priority}</span>
            </div>

            <div className="roadmap-content">
              <div className="roadmap-card-header">
                <div>
                  <span className="roadmap-category">
                    {getCategoryIcon(item.category)}
                    {formatCategory(item.category)}
                  </span>

                  <h3>{item.title}</h3>
                </div>
              </div>

              <div className="roadmap-tags">
                <span>{formatImpact(item.impact)}</span>
                <span>{formatEffort(item.effort)}</span>
              </div>

              <div className="roadmap-text-block">
                <strong>Por que isso importa?</strong>
                <p>{item.reason}</p>
              </div>

              <div className="roadmap-text-block">
                <strong>Ação recomendada</strong>
                <p>{item.recommendation}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}