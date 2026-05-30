function getDetectedStack(findings = []) {
  const stackFinding = findings.find(
    (finding) => finding.type === "detected_stack"
  );

  return stackFinding?.scores || {};
}

function StackGroup({ title, items = [] }) {
  if (!items.length) return null;

  return (
    <div className="stack-group">
      <h3>{title}</h3>

      <div className="stack-tags">
        {items.map((item) => (
          <span className="stack-tag" key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StackOverview({ findings = [] }) {
  const stack = getDetectedStack(findings);

  return (
    <div className="card">
      <h2>Project Intelligence</h2>

      <StackGroup title="Backend" items={stack.backend} />

      <StackGroup title="Frontend" items={stack.frontend} />

      <StackGroup title="Database" items={stack.database} />

      <StackGroup title="DevOps" items={stack.devops} />

      <StackGroup title="CI/CD" items={stack.ci_cd} />

      <StackGroup title="Architecture" items={stack.architecture} />
    </div>
  );
}