import { ShieldCheck } from "lucide-react";
import { downloadAnalysisReport } from "../services/api";

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

  return (
    <div className="card">
      <div className="row">
        <h2>{analysis.project_name}</h2>
        <ShieldCheck />
      </div>

      <div className="score-wrapper">
        <div className={`score ${status.className}`}>{analysis.score}</div>
        <span className={`score-badge ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p>{analysis.summary}</p>

      <button
        className="link-button"
        onClick={() => downloadAnalysisReport(analysis.id)}
      >
        Baixar relatório em PDF
      </button>
    </div>
  );
}