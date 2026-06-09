import { AuthForm } from "./components/AuthForm";
import AIReviewPanel from "./components/AIReviewPanel";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BrainCircuit,
  ChevronDown,
  Clock3,
  Code2,
  Download,
  Eye,
  FileDown,
  FileText,
  GitBranch,
  Info,
  LayoutDashboard,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Upload,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  analyzeRepository,
  downloadAnalysisReport,
  listAnalyses,
  uploadZip,
} from "./services/api";
import { FindingList } from "./components/FindingList";
import "./styles/global.css";

function getStatus(score) {
  if (score === null || score === undefined) {
    return { label: "Sem análise", className: "neutral" };
  }

  if (score >= 85) return { label: "Excelente", className: "excellent" };
  if (score >= 70) return { label: "Muito bom", className: "good" };
  if (score >= 50) return { label: "Com achados", className: "warning" };

  return { label: "Requer atenção", className: "critical" };
}

function getGrade(score) {
  if (score === null || score === undefined) return "-";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";

  return "D";
}

function getRepositoryPath(repositoryUrl) {
  if (!repositoryUrl) return "Nenhum repositório analisado";

  try {
    const url = new URL(repositoryUrl);
    return `${url.host}${url.pathname.replace(/\.git$/, "")}`;
  } catch (_) {
    return repositoryUrl;
  }
}

function getSeverityTotals(findings = []) {
  return findings.reduce(
    (acc, finding) => {
      const severity = finding.severity;

      if (severity && acc[severity] !== undefined) {
        acc[severity] += finding.occurrences || 1;
      }

      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  );
}

function getFindingsTotal(totals) {
  return totals.critical + totals.high + totals.medium + totals.low + totals.info;
}

function formatSeverity(severity) {
  const labels = {
    critical: "Crítico",
    high: "Alto",
    medium: "Médio",
    low: "Baixo",
    info: "Info",
  };

  return labels[severity] || "Info";
}

function QualityRow({ label, value, icon }) {
  return (
    <div className="quality-row">
      <div className="quality-row-label">
        <span>{icon}</span>
        {label}
      </div>

      <div className="quality-row-bar">
        <span style={{ width: `${value}%` }} />
      </div>

      <strong>{value}/100</strong>
    </div>
  );
}

function DonutChart({ totals }) {
  const total = getFindingsTotal(totals);

  const items = [
    { key: "critical", label: "Críticas", value: totals.critical, color: "#ef4444" },
    { key: "high", label: "Altas", value: totals.high, color: "#f97316" },
    { key: "medium", label: "Médias", value: totals.medium, color: "#f59e0b" },
    { key: "low", label: "Baixas", value: totals.low, color: "#3b82f6" },
    { key: "info", label: "Informativas", value: totals.info, color: "#22c55e" },
  ];

  if (total === 0) {
    return (
      <div className="issues-content">
        <div className="donut empty-donut">
          <span />
        </div>

        <div className="issues-list">
          {items.map((item) => (
            <div className="issue-item" key={item.key}>
              <i style={{ background: item.color }} />
              <p>{item.label}</p>
              <strong>0 (0%)</strong>
            </div>
          ))}

          <p className="issues-total">Total: 0 issues</p>
        </div>
      </div>
    );
  }

  let start = 0;

  const gradient = items
    .map((item) => {
      const end = start + (item.value / total) * 100;
      const part = `${item.color} ${start}% ${end}%`;
      start = end;

      return part;
    })
    .join(", ");

  return (
    <div className="issues-content">
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
        <span />
      </div>

      <div className="issues-list">
        {items.map((item) => {
          const percentage = Math.round((item.value / total) * 100);

          return (
            <div className="issue-item" key={item.key}>
              <i style={{ background: item.color }} />
              <p>{item.label}</p>
              <strong>
                {item.value} ({percentage}%)
              </strong>
            </div>
          );
        })}

        <p className="issues-total">Total: {total} issues</p>
      </div>
    </div>
  );
}

function AnalysisLineChart({ history }) {
  const latestItems = [...history].slice(-10);
  const scores = latestItems.map((item) => item.score ?? 0);

  if (scores.length === 0) {
    return (
      <div className="empty-state">
        <p>O gráfico será exibido quando houver análises no histórico.</p>
      </div>
    );
  }

  const points = scores.map((score, index) => {
    const x = scores.length === 1 ? 380 : (index / (scores.length - 1)) * 760;
    const y = 120 - (score / 100) * 100;

    return { x, y, score, item: latestItems[index] };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");

  const areaPath = `${path} L760,130 L0,130 Z`;

  return (
    <div className="line-chart">
      <svg viewBox="0 0 760 130" role="img" aria-label="Evolução das análises">
        <defs>
          <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6d5dfc" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6d5dfc" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#lineFill)" />
        <path d={path} fill="none" stroke="#6d5dfc" strokeWidth="3" />

        {points.map((point) => (
          <circle key={`${point.x}-${point.score}`} cx={point.x} cy={point.y} r="4" />
        ))}
      </svg>

      <div className="chart-dates">
        {latestItems.map((item) => (
          <span key={item.id}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })
              : "--/--"}
          </span>
        ))}
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Zap size={24} />
        </div>

        <strong>
          DevFlow <span>AI</span>
        </strong>
      </div>

      <nav className="sidebar-nav">
        <a className="active" href="#dashboard">
          <LayoutDashboard size={19} />
          Dashboard
        </a>

        <a href="#new-analysis-form">
          <Code2 size={19} />
          Análises
        </a>

        <a href="#historico">
          <Clock3 size={19} />
          Histórico
        </a>

        <a href="#relatorios">
          <FileText size={19} />
          Relatórios
        </a>

        <a href="#configuracoes">
          <Settings size={19} />
          Configurações
        </a>
      </nav>

      <div className="sidebar-card">
        <BrainCircuit size={76} />
        <h3>IA que entende seu código.</h3>
        <p>Análises profundas, recomendações inteligentes e código de alta qualidade.</p>
      </div>

      <div className="plan-card">
        <div className="plan-icon">
          <Shield size={20} />
        </div>

        <div>
          <strong>Plano Profissional</strong>
          <p>Ambiente local de portfólio</p>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ onLogout, onNewAnalysis }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={18} />
        <input placeholder="Buscar análises, repositórios, arquivos..." />
        <kbd>⌘ K</kbd>
      </div>

      <div className="topbar-actions">
        <button className="new-analysis-button" type="button" onClick={onNewAnalysis}>
          <Plus size={18} />
          Nova Análise
        </button>

        <button className="icon-button notification-button" type="button">
          <Bell size={20} />
          <span>3</span>
        </button>

        <div className="user-menu-wrapper">
          <button
            className="user-menu"
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
          >
            <div className="avatar">VP</div>

            <div>
              <strong>Victor Prates</strong>
              <p>Backend Developer</p>
            </div>

            <ChevronDown
              size={18}
              className={isUserMenuOpen ? "chevron-open" : ""}
            />
          </button>

          {isUserMenuOpen && (
            <div className="user-dropdown">
              <button type="button" disabled>
                Meu perfil
              </button>

              <button type="button" disabled>
                Configurações
              </button>

              <button
                type="button"
                className="danger"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [showFindings, setShowFindings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("devflow_token"))
  );

  async function handleDownloadReport() {
  if (!analysis?.id) return;

  setError("");

  try {
    await downloadAnalysisReport(analysis.id);
  } catch (err) {
    setError(err?.response?.data?.detail || "Erro ao gerar relatório PDF.");
  }
}

  async function refreshHistory() {
    try {
      const data = await listAnalyses();
      setHistory(data);
    } catch (_) {}
  }

  useEffect(() => {
    if (isAuthenticated) {
      refreshHistory();
    }
  }, [isAuthenticated]);

  function handleLogin(token) {
    localStorage.setItem("devflow_token", token);
    setIsAuthenticated(true);
  }

  function handleLogout() {
    localStorage.removeItem("devflow_token");
    setIsAuthenticated(false);
    setHistory([]);
    setAnalysis(null);
  }

  function handleNewAnalysis() {
    setAnalysis(null);
    setError("");
    setFile(null);
    setRepositoryUrl("");

    document
      .getElementById("new-analysis-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const severityTotals = useMemo(
    () => getSeverityTotals(analysis?.findings || []),
    [analysis]
  );

  const metrics = analysis?.metrics || {};
  const score = analysis?.score ?? null;
  const status = getStatus(score);

  const mainFindings = (analysis?.findings || [])
    .filter((finding) => finding.category || finding.message)
    .slice(0, 4);

  const qualityScores = {
    architecture: metrics.architecture?.score ?? 0,
    maintainability: metrics.maintainability?.score ?? 0,
    security: metrics.security?.score ?? 0,
    devops: metrics.devops?.score ?? 0,
    quality: metrics.quality?.score ?? 0,
  };

  if (!isAuthenticated) {
    return <AuthForm onLogin={handleLogin} />;
  }

  async function handleRepositorySubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await analyzeRepository(repositoryUrl);
      setAnalysis(result);
      setUploadMode(false);
      await refreshHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao analisar repositório.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadSubmit(event) {
    event.preventDefault();

    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const result = await uploadZip(file);
      setAnalysis(result);
      setUploadMode(true);
      await refreshHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao analisar ZIP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard-shell" id="dashboard">
      <Sidebar />

      <section className="dashboard-main">
        <Topbar onLogout={handleLogout} onNewAnalysis={handleNewAnalysis} />

        <section className="analysis-hero" id="new-analysis-form">
          <div className="analysis-form">
            <h1>Analisar novo repositório</h1>
            <p>Cole a URL do repositório Git ou envie um arquivo ZIP do projeto.</p>

            <form onSubmit={handleRepositorySubmit}>
              <label>URL do repositório</label>

              <div className="repository-input">
                <GitBranch size={20} />

                <input
                  placeholder="https://github.com/empresa/projeto-exemplo"
                  value={repositoryUrl}
                  onChange={(event) => setRepositoryUrl(event.target.value)}
                  required={!file}
                />

                {repositoryUrl && (
                  <button type="button" onClick={() => setRepositoryUrl("")}>
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="hero-actions">
                <button className="primary-button" disabled={loading || !repositoryUrl}>
                  <Sparkles size={18} />
                  {loading && !uploadMode ? "Analisando..." : "Analisar Repositório"}
                </button>

                <label className="secondary-upload-button">
                  <Upload size={18} />
                  Enviar ZIP
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(event) => setFile(event.target.files?.[0])}
                  />
                </label>
              </div>
            </form>

            {file && (
              <form className="zip-form" onSubmit={handleUploadSubmit}>
                <p>
                  Arquivo selecionado: <strong>{file.name}</strong>
                </p>

                <button className="secondary-action-button" disabled={loading}>
                  {loading && uploadMode ? "Analisando ZIP..." : "Analisar ZIP"}
                </button>
              </form>
            )}

            {error && <p className="error-message">{error}</p>}
          </div>

          <div className="hero-illustration">
            <div className="github-folder">
              <GitBranch size={52} />
            </div>
          </div>
        </section>

        <section className="summary-cards">
          <article className="stat-card dark">
            <div>
              <p>
                Score Geral <Info size={14} />
              </p>

              <strong className={`score-value ${status.className}`}>
                {score ?? "--"}
              </strong>

              <span>/100</span>
              <small className={status.className}>{status.label}</small>
            </div>

            <div className={`score-ring ${status.className}`}>
              <span>{score ?? "--"}</span>
            </div>
          </article>

          <article className="stat-card dark">
            <div>
              <p>
                Achados Críticos <Info size={14} />
              </p>

              <strong className="critical-text">{severityTotals.critical}</strong>
              <small>{analysis ? "Requer atenção" : "Aguardando análise"}</small>
            </div>

            <div className="danger-icon">
              <XCircle size={28} />
            </div>
          </article>

          <article className="stat-card dark">
            <div>
              <p>
                Qualidade do Código <Info size={14} />
              </p>

              <strong className="grade-text">{getGrade(score)}</strong>
              <small>{analysis ? status.label : "Sem análise"}</small>
            </div>

            <div className="code-icon">
              <Code2 size={32} />
            </div>
          </article>

          <article className="stat-card dark">
            <div>
              <p>
                Métrica de Qualidade <Info size={14} />
              </p>

              <strong className="coverage-text">{qualityScores.quality}%</strong>
              <small>{analysis ? "Baseada no backend" : "Aguardando análise"}</small>
            </div>

            <div className="coverage-ring">
              <span>{qualityScores.quality}%</span>
            </div>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel quality-panel">
            <div className="panel-title">
              <h2>Resumo de Qualidade</h2>
              <Info size={14} />
            </div>

            <QualityRow label="Arquitetura" value={qualityScores.architecture} icon="▧" />
            <QualityRow
              label="Manutenibilidade"
              value={qualityScores.maintainability}
              icon="▤"
            />
            <QualityRow label="Segurança" value={qualityScores.security} icon="✦" />
            <QualityRow label="DevOps" value={qualityScores.devops} icon="↗" />
            <QualityRow label="Qualidade" value={qualityScores.quality} icon="✓" />

            <button
              className="ghost-link"
              type="button"
              onClick={() => setShowFindings((value) => !value)}
              disabled={!analysis}
            >
              Ver detalhes completos
            </button>
          </article>

          <article className="panel findings-panel">
            <div className="panel-title">
              <h2>Principais Achados</h2>
              <Info size={14} />

              <button
                type="button"
                onClick={() => setShowFindings((value) => !value)}
                disabled={!analysis}
              >
                {showFindings ? "Ocultar" : "Ver todos"}
              </button>
            </div>

            <div className="finding-table">
              {mainFindings.length > 0 ? (
                mainFindings.map((finding, index) => (
                  <div className="finding-row" key={`${finding.file}-${index}`}>
                    <span className={`severity-pill ${finding.severity || "info"}`}>
                      {formatSeverity(finding.severity)}
                    </span>

                    <div>
                      <strong>{finding.file || "Projeto"}</strong>
                      <p>{finding.message}</p>
                    </div>

                    <small>Recomendação</small>
                    <ChevronDown size={16} />
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>
                    {analysis
                      ? "Nenhum achado técnico relevante foi retornado."
                      : "Execute uma análise para visualizar os principais achados."}
                  </p>
                </div>
              )}
            </div>
          </article>

          <article className="panel issues-panel">
            <div className="panel-title">
              <h2>Distribuição de Issues</h2>
              <Info size={14} />
            </div>

            <DonutChart totals={severityTotals} />
          </article>

          {analysis?.ai_review && <AIReviewPanel review={analysis.ai_review} />}

          <article className="panel chart-panel">
            <div className="panel-title">
              <h2>Evolução das Análises</h2>
              <Info size={14} />
              <button type="button" disabled>
                Últimas análises <ChevronDown size={14} />
              </button>
            </div>

            <AnalysisLineChart history={history} />
          </article>

          <article className="panel pdf-panel" id="relatorios">
            <div className="pdf-icon">
              <FileDown size={34} />
            </div>

            <div>
              <h2>Gerar PDF Executivo</h2>
              <p>
                Gere um relatório executivo completo com insights, métricas e recomendações.
              </p>

              <button
                className="outline-button"
                type="button"
                disabled={!analysis}
                onClick={handleDownloadReport}
              >
                <FileDown size={16} />
                Gerar PDF
              </button>
            </div>
          </article>
        </section>

        {showFindings && analysis && (
          <section className="full-findings-panel">
            <FindingList findings={analysis.findings || []} />
          </section>
        )}

        <section className="history-panel panel" id="historico">
          <div className="panel-title">
            <h2>Histórico de Análises</h2>
          </div>

          <div className="history-table">
            <div className="history-head">
              <span>Projeto</span>
              <span>Repositório</span>
              <span>Data</span>
              <span>Score</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            {history.length > 0 ? (
              history.slice(0, 5).map((item) => {
                const itemStatus = getStatus(item.score);

                return (
                  <button
                    className="history-row"
                    key={item.id}
                    type="button"
                    onClick={() => setAnalysis(item)}
                  >
                    <span>
                      <strong>{item.project_name}</strong>
                      <small>
                        <Lock size={12} />
                        Privado
                      </small>
                    </span>

                    <span>{getRepositoryPath(item.repository_url)}</span>

                    <span>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "--/--/----"}
                    </span>

                    <span>
                      <b className={`mini-score ${itemStatus.className}`}>
                        {item.score}
                      </b>
                    </span>

                    <span className="history-status">
                      <i className={itemStatus.className} />
                      {itemStatus.label}
                    </span>

                    <span className="history-actions">
                      <Eye size={16} />
                      <Download size={16} />
                      <MoreVertical size={16} />
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="empty-history">
                <p>Nenhuma análise foi executada ainda.</p>
              </div>
            )}
          </div>

          <button className="history-more" type="button" disabled={history.length === 0}>
            Ver todo histórico
            <ChevronDown size={16} />
          </button>
        </section>

        <footer className="dashboard-footer">
          DevFlow AI • FastAPI, React, PostgreSQL, Docker, análise estática e arquitetura de
          software.
        </footer>
      </section>
    </main>
  );
}
