import { AuthForm } from "./components/AuthForm";
import { useEffect, useState } from "react";
import { GitBranch, UploadCloud, Sparkles } from "lucide-react";
import { analyzeRepository, listAnalyses, uploadZip } from "./services/api";
import { ScoreCard } from "./components/ScoreCard";
import { FindingList } from "./components/FindingList";
import { MetricsCards } from "./components/MetricsCards";
import { QualityBreakdown } from "./components/QualityBreakdown";
import "./styles/global.css";
import { StackOverview } from "./components/StackOverview";

export default function App() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
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
  }

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
      await refreshHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || "Erro ao analisar ZIP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero container">
        <button className="btn" onClick={handleLogout}>
          Sair
        </button>

        <span className="badge">
          <Sparkles size={16} /> &nbsp; AI Backend Copilot
        </span>

        <h1>DevFlow AI</h1>

        <p>
          Plataforma inteligente para analisar repositórios, detectar code
          smells, riscos de segurança, problemas de arquitetura e gerar um
          score técnico profissional.
        </p>
      </section>

      <section className="container grid">
        <div className="card">
          <h2>
            <GitBranch size={20} /> Analisar repositório GitHub
          </h2>

          <form onSubmit={handleRepositorySubmit}>
            <input
              className="input"
              placeholder="https://github.com/usuario/repositorio"
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              required
            />

            <button className="btn" disabled={loading}>
              {loading ? "Analisando..." : "Analisar repositório"}
            </button>
          </form>

          <h2>
            <UploadCloud size={20} /> Ou enviar projeto .zip
          </h2>

          <form onSubmit={handleUploadSubmit}>
            <input
              className="input"
              type="file"
              accept=".zip"
              onChange={(event) => setFile(event.target.files?.[0])}
            />

            <button className="btn" disabled={loading || !file}>
              {loading ? "Analisando..." : "Analisar ZIP"}
            </button>
          </form>

          {error && <p>{error}</p>}
        </div>

        <ScoreCard analysis={analysis} />
      </section>

      {analysis && (
  <>
          <section className="container" style={{ marginTop: 24 }}>
            <MetricsCards findings={analysis.findings || []} />
          </section>

          <section className="container" style={{ marginTop: 24 }}>
            <QualityBreakdown metrics={analysis.metrics} />
          </section>

          <section className="container" style={{ marginTop: 24 }}>
            <StackOverview findings={analysis.findings || []} />
          </section>
        </>
      )}

      <section className="container grid" style={{ marginTop: 24 }}>
        {analysis && <FindingList findings={analysis.findings || []} />}

        <div className="card">
          <h2>Histórico</h2>

          {history.map((item) => (
            <div
              className="finding"
              key={item.id}
              onClick={() => setAnalysis(item)}
              style={{ cursor: "pointer" }}
            >
              <strong>{item.project_name}</strong>

              <p>Score: {item.score}/100</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container footer">
        Criado para demonstrar domínio em FastAPI, React, PostgreSQL, Docker,
        análise estática e arquitetura de software.
      </footer>
    </main>
  );
}