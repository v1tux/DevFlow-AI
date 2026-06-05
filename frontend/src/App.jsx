import { AuthForm } from "./components/AuthForm";
import AIReviewPanel from "./components/AIReviewPanel";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BrainCircuit,
  ChevronDown,
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
  Clock3,
} from "lucide-react";
import { analyzeRepository, listAnalyses, uploadZip } from "./services/api";
import { FindingList } from "./components/FindingList";
import "./styles/global.css";

const fallbackMetrics = {
  architecture: 88,
  maintainability: 82,
  security: 75,
  devops: 84,
  quality: 72,
};

function getStatus(score) {
  if (score >= 85) return { label: "Excelente", className: "excellent" };
  if (score >= 70) return { label: "Muito bom", className: "good" };
  if (score >= 50) return { label: "Com achados", className: "warning" };
  return { label: "Requer atenção", className: "critical" };
}

function getGrade(score) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

function getRepositoryPath(repositoryUrl) {
  if (!repositoryUrl) return "github.com/empresa/projeto-exemplo";
  try {
    const url = new URL(repositoryUrl);
    return `${url.host}${url.pathname.replace(/\.git$/, "")}`;
  } catch (_) {
    return repositoryUrl;
  }
}

function getRepositoryAuthor(repositoryUrl) {
  if (!repositoryUrl) return "v1tux";
  try {
    const url = new URL(repositoryUrl);
    const [owner] = url.pathname.split("/").filter(Boolean);
    return owner || "v1tux";
  } catch (_) {
    return "v1tux";
  }
}

function getSeverityTotals(findings = []) {
  return findings.reduce(
    (acc, finding) => {
      const severity = finding.severity;
      if (severity && acc[severity] !== undefined) acc[severity] += finding.occurrences || 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  );
}

function formatSeverity(severity) {
  const labels = { critical: "Crítico", high: "Alto", medium: "Médio", low: "Baixo", info: "Info" };
  return labels[severity] || "Info";
}

function QualityRow({ label, value, icon }) {
  return (
    <div className="quality-row">
      <div className="quality-row-label"><span>{icon}</span>{label}</div>
      <div className="quality-row-bar"><span style={{ width: `${value}%` }} /></div>
      <strong>{value}/100</strong>
    </div>
  );
}

function DonutChart({ totals }) {
  const total = totals.critical + totals.high + totals.medium + totals.low + totals.info || 1;
  const items = [
    { key: "critical", label: "Críticas", value: totals.critical, color: "#ef4444" },
    { key: "high", label: "Altas", value: totals.high, color: "#f97316" },
    { key: "medium", label: "Médias", value: totals.medium, color: "#f59e0b" },
    { key: "low", label: "Baixas", value: totals.low, color: "#3b82f6" },
    { key: "info", label: "Informativas", value: totals.info, color: "#22c55e" },
  ];
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
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}><span /></div>
      <div className="issues-list">
        {items.map((item) => {
          const percentage = Math.round((item.value / total) * 100);
          return (
            <div className="issue-item" key={item.key}>
              <i style={{ background: item.color }} />
              <p>{item.label}</p>
              <strong>{item.value} ({percentage}%)</strong>
            </div>
          );
        })}
        <p className="issues-total">Total: {total} issues</p>
      </div>
    </div>
  );
}

function AnalysisLineChart() {
  return (
    <div className="line-chart">
      <svg viewBox="0 0 760 130" role="img" aria-label="Evolução das análises">
        <defs>
          <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6d5dfc" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6d5dfc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,84 C55,74 92,82 136,78 C185,72 205,88 250,70 C310,48 342,74 392,62 C445,50 485,86 532,72 C585,55 610,90 655,70 C700,52 724,66 760,58 L760,130 L0,130 Z" fill="url(#lineFill)" />
        <path d="M0,84 C55,74 92,82 136,78 C185,72 205,88 250,70 C310,48 342,74 392,62 C445,50 485,86 532,72 C585,55 610,90 655,70 C700,52 724,66 760,58" fill="none" stroke="#6d5dfc" strokeWidth="3" />
        {[0, 80, 160, 240, 320, 400, 480, 560, 640, 720].map((x, index) => (
          <circle key={x} cx={x} cy={[84, 78, 76, 70, 62, 74, 72, 70, 66, 58][index]} r="4" />
        ))}
      </svg>
      <div className="chart-dates"><span>20/05</span><span>22/05</span><span>24/05</span><span>26/05</span><span>28/05</span><span>30/05</span><span>01/06</span><span>03/06</span><span>05/06</span><span>07/06</span></div>
    </div>
  );
}

function Sidebar({ onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Zap size={24} /></div><strong>DevFlow <span>AI</span></strong></div>
      <nav className="sidebar-nav">
        <a className="active" href="#dashboard"><LayoutDashboard size={19} />Dashboard</a>
        <a href="#analises"><Code2 size={19} />Análises</a>
        <a href="#historico"><Clock3 size={19} />Histórico</a>
        <a href="#relatorios"><FileText size={19} />Relatórios</a>
        <a href="#configuracoes"><Settings size={19} />Configurações</a>
      </nav>
      <div className="sidebar-card"><BrainCircuit size={76} /><h3>IA que entende seu código.</h3><p>Análises profundas, recomendações inteligentes e código de alta qualidade.</p></div>
      <div className="plan-card"><div className="plan-icon"><Shield size={20} /></div><div><strong>Plano Profissional</strong><p>Renova em 22/06/2026</p></div></div>
      <button className="logout-button" onClick={onLogout}>Sair</button>
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
        <button
          className="new-analysis-button"
          type="button"
          onClick={onNewAnalysis}
        >
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
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem("devflow_token")));

  async function refreshHistory() {
    try {
      const data = await listAnalyses();
      setHistory(data);
    } catch (_) {}
  }

  useEffect(() => { if (isAuthenticated) refreshHistory(); }, [isAuthenticated]);

  function handleLogin(token) { localStorage.setItem("devflow_token", token); setIsAuthenticated(true); }
  function handleLogout() { localStorage.removeItem("devflow_token"); setIsAuthenticated(false); setHistory([]); setAnalysis(null); }
  function handleNewAnalysis() {
  setAnalysis(null);
  setError("");
  setFile(null);
  setRepositoryUrl("");

  document
    .getElementById("new-analysis-form")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

  const severityTotals = useMemo(() => getSeverityTotals(analysis?.findings || []), [analysis]);
  const metrics = analysis?.metrics || {};
  const score = analysis?.score ?? 87;
  const status = getStatus(score);
  const repositoryPath = getRepositoryPath(analysis?.repository_url || repositoryUrl);
  const repositoryAuthor = getRepositoryAuthor(analysis?.repository_url || repositoryUrl);
  const mainFindings = (analysis?.findings || []).filter((finding) => finding.category || finding.message).slice(0, 4);
  const findingsTotal = severityTotals.critical + severityTotals.high + severityTotals.medium + severityTotals.low;
  const qualityScores = {
    architecture: metrics.architecture?.score ?? fallbackMetrics.architecture,
    maintainability: metrics.maintainability?.score ?? fallbackMetrics.maintainability,
    security: metrics.security?.score ?? fallbackMetrics.security,
    devops: metrics.devops?.score ?? fallbackMetrics.devops,
    quality: metrics.quality?.score ?? fallbackMetrics.quality,
  };

  if (!isAuthenticated) return <AuthForm onLogin={handleLogin} />;

  async function handleRepositorySubmit(event) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const result = await analyzeRepository(repositoryUrl);
      setAnalysis(result); setUploadMode(false); await refreshHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao analisar repositório.");
    } finally { setLoading(false); }
  }

  async function handleUploadSubmit(event) {
    event.preventDefault();
    if (!file) return;
    setLoading(true); setError("");
    try {
      const result = await uploadZip(file);
      setAnalysis(result); setUploadMode(true); await refreshHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao analisar ZIP.");
    } finally { setLoading(false); }
  }

  const demoFindings = [
    { severity: "critical", file: "sql/utils/auth.ts:47", message: "Exposição de segredo em código fonte" },
    { severity: "high", file: "src/api/user-service.ts:112", message: "Consulta N+1 identificada" },
    { severity: "medium", file: "src/components/button.tsx:68", message: "Função com alta complexidade cognitiva" },
    { severity: "low", file: "README.md", message: "Informações desatualizadas no README" },
  ];

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
                <input placeholder="https://github.com/empresa/projeto-exemplo" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} required={!file} />
                {repositoryUrl && <button type="button" onClick={() => setRepositoryUrl("")}><X size={16} /></button>}
              </div>
              <div className="hero-actions">
                <button className="primary-button" disabled={loading || !repositoryUrl}><Sparkles size={18} />{loading && !uploadMode ? "Analisando..." : "Analisar Repositório"}</button>
                <label className="secondary-upload-button"><Upload size={18} />Enviar ZIP<input type="file" accept=".zip" onChange={(event) => setFile(event.target.files?.[0])} /></label>
              </div>
            </form>
            {file && <form className="zip-form" onSubmit={handleUploadSubmit}><p>Arquivo selecionado: <strong>{file.name}</strong></p><button className="secondary-action-button" disabled={loading}>{loading && uploadMode ? "Analisando ZIP..." : "Analisar ZIP"}</button></form>}
            {error && <p className="error-message">{error}</p>}
          </div>
          <div className="hero-illustration"><div className="github-folder"><GitBranch size={52} /></div></div>
        </section>

        <section className="summary-cards">
          <article className="stat-card dark"><div><p>Score Geral <Info size={14} /></p><strong className={`score-value ${status.className}`}>{score}</strong><span>/100</span><small className={status.className}>{status.label}</small></div><div className={`score-ring ${status.className}`}><span>{score}</span></div></article>
          <article className="stat-card dark"><div><p>Achados Críticos <Info size={14} /></p><strong className="critical-text">{severityTotals.critical}</strong><small>Requer atenção</small></div><div className="danger-icon"><XCircle size={28} /></div></article>
          <article className="stat-card dark"><div><p>Qualidade do Código <Info size={14} /></p><strong className="grade-text">{getGrade(score)}</strong><small>Muito boa</small></div><div className="code-icon"><Code2 size={32} /></div></article>
          <article className="stat-card dark"><div><p>Cobertura / Métricas <Info size={14} /></p><strong className="coverage-text">{qualityScores.quality}%</strong><small>Indicador técnico</small></div><div className="coverage-ring"><span>{qualityScores.quality}%</span></div></article>
        </section>

        <section className="dashboard-grid">
          <article className="panel quality-panel"><div className="panel-title"><h2>Resumo de Qualidade</h2><Info size={14} /></div><QualityRow label="Arquitetura" value={qualityScores.architecture} icon="▧" /><QualityRow label="Manutenibilidade" value={qualityScores.maintainability} icon="▤" /><QualityRow label="Segurança" value={qualityScores.security} icon="✦" /><QualityRow label="Performance" value={qualityScores.devops} icon="↗" /><QualityRow label="Testes" value={qualityScores.quality} icon="✓" /><button className="ghost-link">Ver detalhes completos</button></article>

          <article className="panel findings-panel"><div className="panel-title"><h2>Principais Achados</h2><Info size={14} /><button onClick={() => setShowFindings((value) => !value)}>{showFindings ? "Ocultar" : "Ver todos"}</button></div><div className="finding-table">{(mainFindings.length ? mainFindings : demoFindings).map((finding, index) => <div className="finding-row" key={`${finding.file}-${index}`}><span className={`severity-pill ${finding.severity || "info"}`}>{formatSeverity(finding.severity)}</span><div><strong>{finding.file || "Projeto"}</strong><p>{finding.message}</p></div><small>Recomendação</small><ChevronDown size={16} /></div>)}</div></article>

          <article className="panel issues-panel"><div className="panel-title"><h2>Distribuição de Issues</h2><Info size={14} /></div><DonutChart totals={{ ...severityTotals, info: Math.max(5, Math.round((findingsTotal || 20) * 0.1)) }} /></article>

          {analysis?.ai_review && <AIReviewPanel review={analysis.ai_review} />}

          <article className="panel chart-panel"><div className="panel-title"><h2>Evolução das Análises</h2><Info size={14} /><button>Últimas 3 semanas <ChevronDown size={14} /></button></div><AnalysisLineChart /></article>

          <article className="panel pdf-panel" id="relatorios"><div className="pdf-icon"><FileDown size={34} /></div><div><h2>Gerar PDF Executivo</h2><p>Gere um relatório executivo completo com insights, métricas e recomendações.</p>{analysis ? <a className="outline-button" href={`http://localhost:8000/analyses/${analysis.id}/report`} target="_blank" rel="noreferrer"><FileDown size={16} />Gerar PDF</a> : <button className="outline-button" disabled><FileDown size={16} />Gerar PDF</button>}</div></article>
        </section>

        {showFindings && analysis && <section className="full-findings-panel"><FindingList findings={analysis.findings || []} /></section>}

        <section className="history-panel panel" id="historico"><div className="panel-title"><h2>Histórico de Análises</h2></div><div className="history-table"><div className="history-head"><span>Projeto</span><span>Repositório</span><span>Data</span><span>Score</span><span>Status</span><span>Ações</span></div>{(history.length ? history : [{ id: "demo-1", project_name: "projeto-exemplo", repository_url: "https://github.com/empresa/projeto-exemplo", score: 87, created_at: new Date().toISOString() }, { id: "demo-2", project_name: "api-backend", repository_url: "https://github.com/empresa/api-backend", score: 75, created_at: new Date(Date.now() - 86400000).toISOString() }, { id: "demo-3", project_name: "web-frontend", repository_url: "https://github.com/empresa/web-frontend", score: 58, created_at: new Date(Date.now() - 172800000).toISOString() }]).slice(0, 5).map((item) => { const itemStatus = getStatus(item.score); return <button className="history-row" key={item.id} onClick={() => history.length && setAnalysis(item)}><span><strong>{item.project_name}</strong><small><Lock size={12} />Privado</small></span><span>{getRepositoryPath(item.repository_url)}</span><span>{item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Hoje"}</span><span><b className={`mini-score ${itemStatus.className}`}>{item.score}</b></span><span className="history-status"><i className={itemStatus.className} />{itemStatus.label}</span><span className="history-actions"><Eye size={16} /><Download size={16} /><MoreVertical size={16} /></span></button>; })}</div><button className="history-more">Ver todo histórico<ChevronDown size={16} /></button></section>

        <footer className="dashboard-footer">DevFlow AI • FastAPI, React, PostgreSQL, Docker, análise estática e arquitetura de software.</footer>
      </section>
    </main>
  );
}
