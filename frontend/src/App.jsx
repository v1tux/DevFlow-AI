import { AuthForm } from "./components/AuthForm";
import AIReviewPanel from "./components/AIReviewPanel";
import { ImprovementRoadmap } from "./components/ImprovementRoadmap";
import { AnalysisDetailPanel } from "./components/AnalysisDetailPanel";
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
  compareAnalyses,
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

function formatConfidence(confidence) {
  const labels = {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
  };

  return labels[confidence] || "Não informada";
}

function formatSource(source) {
  const labels = {
    static_check: "Análise estática",
    secret_detector: "Detector de segredos",
    sensitive_field_detector: "Detector de campo sensível",
    bandit: "Scanner de segurança",
    complexity: "Complexidade de código",
    dockerfile_check: "Análise de Dockerfile",
    devops_check: "Análise DevOps",
  };

  return labels[source] || source || "Não informada";
}

function buildNotifications(analysis, severityTotals) {
  if (!analysis) {
    return [];
  }

  const notifications = [
    {
      id: "analysis-completed",
      title: "Análise concluída",
      description: `${analysis.project_name} recebeu score ${analysis.score}/100.`,
      type: "success",
    },
    {
      id: "pdf-ready",
      title: "PDF disponível",
      description: "O relatório executivo já pode ser baixado.",
      type: "info",
    },
  ];

  if (severityTotals.critical > 0) {
    notifications.unshift({
      id: "critical-findings",
      title: "Achados críticos detectados",
      description: `${severityTotals.critical} achado(s) crítico(s) exigem atenção.`,
      type: "danger",
    });
  }

  if (severityTotals.high > 0) {
    notifications.push({
      id: "high-findings",
      title: "Achados altos encontrados",
      description: `${severityTotals.high} achado(s) de alta severidade foram identificados.`,
      type: "warning",
    });
  }

  return notifications;
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
function Topbar({
  onLogout,
  onNewAnalysis,
  searchTerm,
  onSearchChange,
  notifications,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={18} />
        <input
          placeholder="Buscar análises, repositórios, arquivos..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <kbd>⌘ K</kbd>
      </div>

      <div className="topbar-actions">
        <button className="new-analysis-button" type="button" onClick={onNewAnalysis}>
          <Plus size={18} />
          Nova Análise
        </button>

        <div className="notification-wrapper">
          <button
            className="icon-button notification-button"
            type="button"
            onClick={() => setIsNotificationsOpen((current) => !current)}
          >
            <Bell size={20} />

            {notifications.length > 0 && <span>{notifications.length}</span>}
          </button>

          {isNotificationsOpen && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <strong>Notificações</strong>
                <small>{notifications.length} alerta(s)</small>
              </div>

              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    className={`notification-item ${notification.type}`}
                    key={notification.id}
                  >
                    <strong>{notification.title}</strong>
                    <p>{notification.description}</p>
                  </div>
                ))
              ) : (
                <div className="notification-empty">
                  <p>Nenhuma notificação no momento.</p>
                </div>
              )}
            </div>
          )}
        </div>

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
  const [searchTerm, setSearchTerm] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [selectedAnalysisDetail, setSelectedAnalysisDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedComparisonIds, setSelectedComparisonIds] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
  const [expandedFindingKey, setExpandedFindingKey] = useState(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("devflow_token"))
  );

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
    setSelectedAnalysisDetail(null);
    setSelectedComparisonIds([]);
    setComparisonResult(null);
    setComparisonError("");
  }

  function handleNewAnalysis() {
    setAnalysis(null);
    setError("");
    setFile(null);
    setRepositoryUrl("");
    setSearchTerm("");
    setExpandedFindingKey(null);
    setSelectedAnalysisDetail(null);
    setShowAllHistory(false);
    setSelectedComparisonIds([]);
    setComparisonResult(null);
    setComparisonError("");

    document
      .getElementById("new-analysis-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleLoadAnalysisFromDetail(selectedAnalysis) {
    setAnalysis(selectedAnalysis);
    setSelectedAnalysisDetail(null);

    document
      .getElementById("dashboard")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDownloadDetailReport(analysisId) {
    if (!analysisId) return;

    setError("");

    try {
      await downloadAnalysisReport(analysisId);
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao baixar relatório PDF.");
    }
  }

  async function handleDownloadHistoryReport(event, analysisId) {
    event.stopPropagation();

    if (!analysisId) return;

    setError("");

    try {
      await downloadAnalysisReport(analysisId);
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao baixar relatório PDF.");
    }
  }

  async function handleDownloadReport() {
    if (!analysis?.id) return;

    setError("");

    try {
      await downloadAnalysisReport(analysis.id);
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao gerar relatório PDF.");
    }
  }

  function handleToggleComparisonId(event, analysisId) {
    event.stopPropagation();

    setComparisonError("");
    setComparisonResult(null);

    setSelectedComparisonIds((currentIds) => {
      if (currentIds.includes(analysisId)) {
        return currentIds.filter((id) => id !== analysisId);
      }

      if (currentIds.length >= 2) {
        setComparisonError("Você pode selecionar no máximo duas análises.");
        return currentIds;
      }

      return [...currentIds, analysisId];
    });
  }

  async function handleCompareAnalyses() {
    if (selectedComparisonIds.length !== 2) {
      setComparisonError("Selecione exatamente duas análises para comparar.");
      return;
    }

    try {
      setIsComparing(true);
      setComparisonError("");

      const selectedAnalyses = selectedComparisonIds
        .map((id) => history.find((item) => item.id === id))
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const baseId = selectedAnalyses[0].id;
      const targetId = selectedAnalyses[1].id;

      const data = await compareAnalyses(baseId, targetId);

      setComparisonResult(data);
    } catch (err) {
      console.error(err);
      setComparisonError(
        err?.response?.data?.detail || "Não foi possível comparar as análises selecionadas."
      );
    } finally {
      setIsComparing(false);
    }
  }

  async function handleRepositorySubmit(event) {
    event.preventDefault();
    setLoading(true);
    setUploadMode(false);
    setError("");
    setExpandedFindingKey(null);

    try {
      const result = await analyzeRepository(repositoryUrl);
      setAnalysis(result);
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
    setUploadMode(true);
    setError("");
    setExpandedFindingKey(null);

    try {
      const result = await uploadZip(file);
      setAnalysis(result);
      await refreshHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao analisar ZIP.");
    } finally {
      setLoading(false);
    }
  }

  const severityTotals = useMemo(
    () => getSeverityTotals(analysis?.findings || []),
    [analysis]
  );

  const notifications = useMemo(
    () => buildNotifications(analysis, severityTotals),
    [analysis, severityTotals]
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

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredHistory = history.filter((item) => {
    const itemStatus = getStatus(item.score);

    const searchableContent = [
      item.project_name,
      item.repository_url,
      String(item.score),
      itemStatus.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableContent.includes(normalizedSearch);
  });

  const visibleHistory = showAllHistory
    ? filteredHistory
    : filteredHistory.slice(0, 5);

  if (!isAuthenticated) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <main className="dashboard-shell" id="dashboard">
      <Sidebar />

      <section className="dashboard-main">
        <Topbar
          onLogout={handleLogout}
          onNewAnalysis={handleNewAnalysis}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          notifications={notifications}
        />

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

        {loading && (
          <section className="analysis-loading-panel">
            <div className="loading-orb">
              <Sparkles size={28} />
            </div>

            <div>
              <h2>
                {uploadMode ? "Analisando arquivo ZIP" : "Analisando repositório"}
              </h2>

              <p>
                O DevFlow está coletando arquivos, executando verificações técnicas,
                calculando métricas e preparando os achados da análise.
              </p>

              <div className="loading-steps">
                <span>Coletando projeto</span>
                <span>Executando análise estática</span>
                <span>Calculando score</span>
                <span>Gerando insights</span>
              </div>
            </div>
          </section>
        )}

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
                mainFindings.map((finding, index) => {
                  const findingKey = `${finding.file || "project"}-${index}`;
                  const isExpanded = expandedFindingKey === findingKey;

                  return (
                    <div
                      className={`finding-row-wrapper ${isExpanded ? "expanded" : ""}`}
                      key={findingKey}
                    >
                      <button
                        className="finding-row"
                        type="button"
                        onClick={() =>
                          setExpandedFindingKey((current) =>
                            current === findingKey ? null : findingKey
                          )
                        }
                      >
                        <span className={`severity-pill ${finding.severity || "info"}`}>
                          {formatSeverity(finding.severity)}
                        </span>

                        <div>
                          <strong>{finding.file || "Projeto"}</strong>
                          <p>{finding.message}</p>
                        </div>

                        <small>Detalhes</small>

                        <ChevronDown
                          size={16}
                          className={isExpanded ? "chevron-open" : ""}
                        />
                      </button>

                      {isExpanded && (
                        <div className="finding-expanded-detail">
                          <div className="finding-detail-grid">
                            <span>
                              <strong>Confiança</strong>
                              {formatConfidence(finding.confidence)}
                            </span>

                            <span>
                              <strong>Fonte</strong>
                              {formatSource(finding.source)}
                            </span>

                            <span>
                              <strong>Ocorrências</strong>
                              {finding.occurrences || 1}
                            </span>
                          </div>

                          {finding.evidence && (
                            <div className="finding-expanded-block">
                              <strong>Evidência</strong>
                              <p>{finding.evidence}</p>
                            </div>
                          )}

                          {finding.recommendation && (
                            <div className="finding-expanded-block">
                              <strong>Recomendação</strong>
                              <p>{finding.recommendation}</p>
                            </div>
                          )}

                          {finding.files?.length > 1 && (
                            <div className="finding-expanded-block">
                              <strong>Arquivos impactados</strong>

                              <ul>
                                {finding.files.slice(0, 5).map((file) => (
                                  <li key={file}>{file}</li>
                                ))}
                              </ul>

                              {finding.files.length > 5 && (
                                <p>
                                  +{finding.files.length - 5} arquivo(s) adicional(is).
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
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
          
          <ImprovementRoadmap roadmap={analysis?.improvement_roadmap || []} />

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

          <div className="comparison-toolbar">
            <div>
              <strong>Comparar evolução técnica</strong>
              <p>
                Selecione duas análises do histórico para comparar score, achados e severidade.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCompareAnalyses}
              disabled={selectedComparisonIds.length !== 2 || isComparing}
            >
              {isComparing
                ? "Comparando..."
                : `Comparar análises (${selectedComparisonIds.length}/2)`}
            </button>
          </div>

          {comparisonError && <p className="comparison-error">{comparisonError}</p>}

          {comparisonResult && (
            <section className="comparison-result-card">
              <div className="comparison-result-header">
                <div>
                  <span>Resultado da comparação</span>
                  <h3>{comparisonResult.comparison.summary}</h3>
                </div>

                <strong className={`comparison-status ${comparisonResult.comparison.status}`}>
                  {comparisonResult.comparison.status === "improved" && "Melhorou"}
                  {comparisonResult.comparison.status === "regressed" && "Regrediu"}
                  {comparisonResult.comparison.status === "stable" && "Estável"}
                </strong>
              </div>

              <div className="comparison-result-grid">
                <article>
                  <span>Análise base</span>
                  <strong>{comparisonResult.base_analysis.score}</strong>
                  <p>{comparisonResult.base_analysis.project_name}</p>
                  <small>{comparisonResult.base_analysis.total_findings} achados</small>
                </article>

                <article>
                  <span>Análise atual</span>
                  <strong>{comparisonResult.target_analysis.score}</strong>
                  <p>{comparisonResult.target_analysis.project_name}</p>
                  <small>{comparisonResult.target_analysis.total_findings} achados</small>
                </article>

                <article>
                  <span>Diferença</span>
                  <strong>
                    {comparisonResult.comparison.score_delta > 0
                      ? `+${comparisonResult.comparison.score_delta}`
                      : comparisonResult.comparison.score_delta}
                  </strong>
                  <p>
                    {comparisonResult.comparison.findings_delta > 0
                      ? `+${comparisonResult.comparison.findings_delta}`
                      : comparisonResult.comparison.findings_delta}{" "}
                    achados
                  </p>
                </article>
              </div>

              <div className="comparison-severity-list">
                {Object.entries(comparisonResult.comparison.severity_delta).map(
                  ([severity, delta]) => (
                    <div key={severity} className="comparison-severity-item">
                      <span>{severity}</span>
                      <strong>{delta > 0 ? `+${delta}` : delta}</strong>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          <div className="history-table">
            <div className="history-head">
              <span>Projeto</span>
              <span>Repositório</span>
              <span>Data</span>
              <span>Score</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            {filteredHistory.length > 0 ? (
              visibleHistory.map((item) => {
                const itemStatus = getStatus(item.score);
                const isSelectedForComparison = selectedComparisonIds.includes(item.id);

                return (
                  <button
                    className={`history-row ${isSelectedForComparison ? "selected-for-comparison" : ""}`}
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAnalysisDetail(item)}
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
                      <button
                        type="button"
                        title={
                          isSelectedForComparison
                            ? "Remover da comparação"
                            : "Selecionar para comparação"
                        }
                        className={isSelectedForComparison ? "comparison-action active" : "comparison-action"}
                        onClick={(event) => handleToggleComparisonId(event, item.id)}
                      >
                        {isSelectedForComparison ? "✓" : "⇄"}
                      </button>
                      
                      <button
                        type="button"
                        title="Carregar análise"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAnalysis(item);
                          document
                            .getElementById("dashboard")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        title="Baixar PDF"
                        onClick={(event) => handleDownloadHistoryReport(event, item.id)}
                      >
                        <Download size={16} />
                      </button>

                      <button type="button" title="Mais opções" disabled>
                        <MoreVertical size={16} />
                      </button>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="empty-history">
                <p>
                  {history.length === 0
                    ? "Nenhuma análise foi executada ainda."
                    : "Nenhuma análise encontrada para essa busca."}
                </p>
              </div>
            )}
          </div>

          <button
            className="history-more"
            type="button"
            disabled={filteredHistory.length <= 5}
            onClick={() => setShowAllHistory((current) => !current)}
          >
            {showAllHistory ? "Mostrar menos" : "Ver todo histórico"}
            <ChevronDown
              size={16}
              className={showAllHistory ? "chevron-open" : ""}
            />
          </button>
        </section>

        <AnalysisDetailPanel
          analysis={selectedAnalysisDetail}
          onClose={() => setSelectedAnalysisDetail(null)}
          onLoadAnalysis={handleLoadAnalysisFromDetail}
          onDownloadReport={handleDownloadDetailReport}
        />

        <footer className="dashboard-footer">
          DevFlow AI • FastAPI, React, PostgreSQL, Docker, análise estática e arquitetura de
          software.
        </footer>
      </section>
    </main>
  );
}
