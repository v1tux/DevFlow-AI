import { ShieldCheck } from "lucide-react";
import { downloadAnalysisReport } from "../services/api";

function getRepositoryAuthor(repositoryUrl) {
  if (!repositoryUrl) {
    return null;
  }

  try {
    const url = new URL(repositoryUrl);
    const parts = url.pathname.split("/").filter(Boolean);

    return parts[0] || null;
  } catch {
    return null;
  }
}

function getScoreStatus(score) {
  if (score >= 85) return { label: "Excelente", className: "score-good" };
  if (score >= 70) return { label: "Boa", className: "score-ok" };
  if (score >= 50) return { label: "Regular", className: "score-warning" };
  return { label: "Crítica", className: "score-critical" };
}

export function ScoreCard({ analysis }) {
  if (!analysis) {
    return (
      <div className="card">
        <div className="row">
          <h2>Resultado</h2>
          <ShieldCheck />
        </div>

        <p>Execute uma análise para visualizar score, resumo técnico e recomendações.</p>
      </div>
    );
  }

  const status = getScoreStatus(analysis.score);
  const scoreExplanation = analysis.score_explanation || [];
  const repositoryAuthor = getRepositoryAuthor(analysis.repository_url);

  return (
    <div className="card">
      <div className="row">
        <div>
          <h2>{analysis.project_name}</h2>

          {repositoryAuthor && (
            <p className="project-author">por {repositoryAuthor}</p>
          )}
        </div>
        <ShieldCheck />
      </div>

      <div className="score-wrapper">
        <div className={`score ${status.className}`}>{analysis.score}</div>
        <span className={`score-badge ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p>{analysis.summary}</p>

      {scoreExplanation.length > 0 && (
        <div className="score-explanation">
          <h3>Por que essa nota?</h3>

          <ul>
            {scoreExplanation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        className="link-button"
        onClick={() => downloadAnalysisReport(analysis.id)}
      >
        Baixar relatório em PDF
      </button>
    </div>
  );
}