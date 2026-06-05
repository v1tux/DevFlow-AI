function AIReviewPanel({ review }) {
  if (!review) return null;

  const hasMainRisks = review.main_risks?.length > 0;
  const hasNextSteps = review.recommended_next_steps?.length > 0;

  if (!hasMainRisks && !hasNextSteps) return null;

  return (
    <article className="panel ai-review-panel">
      <div className="panel-title">
        <div>
          <p className="section-kicker">Revisão inteligente</p>
          <h2>Riscos e próximos passos</h2>
        </div>
      </div>

      {hasMainRisks && (
        <div className="ai-review-block">
          <h3>Principais riscos</h3>
          <ul>
            {review.main_risks.map((risk, index) => (
              <li key={`${risk}-${index}`}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {hasNextSteps && (
        <div className="ai-review-block">
          <h3>Próximos passos recomendados</h3>
          <ul>
            {review.recommended_next_steps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export default AIReviewPanel;
