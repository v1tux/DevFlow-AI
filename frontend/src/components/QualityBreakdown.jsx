function calculateCategoryScore(findings = [], category, overallScore = 0) {
  const categoryFindings = findings.filter(
    (finding) => finding.category === category
  );

  const penalty = categoryFindings.reduce((total, finding) => {
    const severity = finding.severity;

    if (severity === "critical") return total + 15;
    if (severity === "high") return total + 9;
    if (severity === "medium") return total + 5;
    if (severity === "low") return total + 2;

    return total + 1;
  }, 0);

  let score = Math.max(0, Math.min(90, overallScore - 4 - penalty));

  if (categoryFindings.length === 0) {
    score = Math.min(88, Math.max(55, overallScore - 6));
  }

  return score;
}

function ScoreBar({ label, value }) {
  return (
    <div className="quality-item">
      <div className="quality-header">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="quality-bar">
        <div
          className="quality-fill"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function QualityBreakdown({
  findings = [],
  overallScore = 0,
}) {
  const validFindings = findings.filter(
    (finding) => finding.category
  );

  const scores = {
    security: calculateCategoryScore(
      validFindings,
      "security",
      overallScore
    ),

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

    devops: calculateCategoryScore(
      validFindings,
      "devops",
      overallScore
    ),

    quality: calculateCategoryScore(
      validFindings,
      "quality",
      overallScore
    ),
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