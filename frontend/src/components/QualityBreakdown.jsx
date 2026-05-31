function normalizeScore(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function severityPenalty(severity) {
  if (severity === "critical") return 15;
  if (severity === "high") return 9;
  if (severity === "medium") return 5;
  if (severity === "low") return 2;

  return 1;
}

function calculateCategoryScore(findings = [], category, overallScore = null) {
  const normalizedOverallScore = normalizeScore(overallScore);

  if (normalizedOverallScore === null) {
    return null;
  }

  const categoryFindings = findings.filter(
    (finding) => finding.category === category
  );

  const penalty = categoryFindings.reduce((total, finding) => {
    return total + severityPenalty(finding.severity);
  }, 0);

  return normalizeScore(normalizedOverallScore - penalty);
}

function ScoreBar({ label, value }) {
  const hasValue = value !== null && value !== undefined;

  return (
    <div className="quality-item">
      <div className="quality-header">
        <span>{label}</span>
        <strong>{hasValue ? value : "N/A"}</strong>
      </div>

      <div className="quality-bar">
        <div
          className="quality-fill"
          style={{ width: `${hasValue ? value : 0}%` }}
        />
      </div>
    </div>
  );
}

export function QualityBreakdown({ findings = [], overallScore = null }) {
  const validFindings = findings.filter((finding) => finding.category);

  const scores = {
    security: calculateCategoryScore(validFindings, "security", overallScore),
    architecture: calculateCategoryScore(
      validFindings,
      "architecture",
      overallScore
    ),
    maintainability: calculateCategoryScore(
      validFindings,
      "complexity",
      overallScore
    ),
    devops: calculateCategoryScore(validFindings, "devops", overallScore),
    quality: calculateCategoryScore(validFindings, "quality", overallScore),
  };

  return (
    <div className="card">
      <h2>Quality Breakdown</h2>

      <ScoreBar label="Security" value={scores.security} />
      <ScoreBar label="Architecture" value={scores.architecture} />
      <ScoreBar label="Maintainability" value={scores.maintainability} />
      <ScoreBar label="DevOps" value={scores.devops} />
      <ScoreBar label="Quality" value={scores.quality} />
    </div>
  );
}