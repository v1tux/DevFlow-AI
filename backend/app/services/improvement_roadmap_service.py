class ImprovementRoadmapService:
    def generate(self, score: int, metrics: dict, findings: list[dict]) -> list[dict]:
        roadmap = []

        severity_totals = self._count_severities(findings)

        if severity_totals["critical"] > 0:
            roadmap.append(
                {
                    "priority": len(roadmap) + 1,
                    "title": "Corrigir achados críticos de segurança",
                    "category": "security",
                    "impact": "high",
                    "effort": "medium",
                    "reason": (
                        "Achados críticos indicam riscos que podem comprometer "
                        "segurança, estabilidade ou dados sensíveis do projeto."
                    ),
                    "recommendation": (
                        "Priorize os arquivos marcados como críticos, remova segredos "
                        "expostos, valide permissões e revise pontos sensíveis da aplicação."
                    ),
                }
            )

        if severity_totals["high"] > 0:
            roadmap.append(
                {
                    "priority": len(roadmap) + 1,
                    "title": "Reduzir achados de alta severidade",
                    "category": "quality",
                    "impact": "high",
                    "effort": "medium",
                    "reason": (
                        "Achados de alta severidade podem afetar a confiabilidade, "
                        "manutenibilidade e evolução segura do sistema."
                    ),
                    "recommendation": (
                        "Agrupe os achados por categoria e resolva primeiro os que impactam "
                        "segurança, arquitetura e fluxo principal da aplicação."
                    ),
                }
            )

        security_score = self._get_metric_score(metrics, "security")

        if security_score < 70:
            roadmap.append(
                {
                    "priority": len(roadmap) + 1,
                    "title": "Fortalecer a camada de segurança",
                    "category": "security",
                    "impact": "high",
                    "effort": "medium",
                    "reason": (
                        "A métrica de segurança está abaixo do ideal para um projeto "
                        "com proposta profissional."
                    ),
                    "recommendation": (
                        "Revise autenticação, validação de dados, exposição de variáveis, "
                        "tratamento de erros e dependências sensíveis."
                    ),
                }
            )

        architecture_score = self._get_metric_score(metrics, "architecture")

        if architecture_score < 70:
            roadmap.append(
                {
                    "priority": len(roadmap) + 1,
                    "title": "Melhorar organização arquitetural",
                    "category": "architecture",
                    "impact": "medium",
                    "effort": "medium",
                    "reason": (
                        "Uma arquitetura pouco clara dificulta manutenção, testes e evolução "
                        "do projeto."
                    ),
                    "recommendation": (
                        "Separe responsabilidades entre rotas, services, schemas, models e "
                        "camadas de infraestrutura."
                    ),
                }
            )

        maintainability_score = self._get_metric_score(metrics, "maintainability")

        if maintainability_score < 70:
            roadmap.append(
                {
                    "priority": len(roadmap) + 1,
                    "title": "Aumentar manutenibilidade do código",
                    "category": "maintainability",
                    "impact": "medium",
                    "effort": "medium",
                    "reason": (
                        "Código difícil de manter aumenta o custo de evolução e a chance de "
                        "regressões."
                    ),
                    "recommendation": (
                        "Reduza funções longas, elimine duplicações, melhore nomes e "
                        "extraia regras repetidas para services ou helpers."
                    ),
                }
            )

        devops_score = self._get_metric_score(metrics, "devops")

        if devops_score < 70:
            roadmap.append(
                {
                    "priority": len(roadmap) + 1,
                    "title": "Evoluir práticas de DevOps",
                    "category": "devops",
                    "impact": "medium",
                    "effort": "low",
                    "reason": (
                        "Boas práticas de DevOps tornam o projeto mais confiável para rodar, "
                        "testar e publicar."
                    ),
                    "recommendation": (
                        "Revise Dockerfile, docker-compose, variáveis de ambiente, scripts de "
                        "execução, documentação e pipeline de CI/CD."
                    ),
                }
            )

        quality_score = self._get_metric_score(metrics, "quality")

        if score < 70 or quality_score < 70:
            roadmap.append(
                {
                    "priority": len(roadmap) + 1,
                    "title": "Elevar o score geral do projeto",
                    "category": "quality",
                    "impact": "medium",
                    "effort": "medium",
                    "reason": (
                        "O score indica que ainda existem pontos relevantes de melhoria "
                        "técnica antes de considerar o projeto maduro."
                    ),
                    "recommendation": (
                        "Corrija os achados mais recorrentes, reexecute a análise e acompanhe "
                        "a evolução pelo histórico e comparação de análises."
                    ),
                }
            )

        if not roadmap:
            roadmap.append(
                {
                    "priority": 1,
                    "title": "Manter evolução contínua",
                    "category": "quality",
                    "impact": "low",
                    "effort": "low",
                    "reason": (
                        "A análise atual não identificou riscos prioritários, mas o projeto "
                        "deve continuar evoluindo com boas práticas."
                    ),
                    "recommendation": (
                        "Mantenha testes, documentação, revisão de dependências e análises "
                        "periódicas a cada mudança relevante."
                    ),
                }
            )

        return roadmap[:5]

    def _count_severities(self, findings: list[dict]) -> dict:
        totals = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "info": 0,
            "unknown": 0,
        }

        for finding in findings:
            if not isinstance(finding, dict):
                totals["unknown"] += 1
                continue

            severity = str(finding.get("severity") or "unknown").lower()

            if severity not in totals:
                severity = "unknown"

            totals[severity] += finding.get("occurrences") or 1

        return totals

    def _get_metric_score(self, metrics: dict, key: str) -> int:
        metric = metrics.get(key) or {}

        if isinstance(metric, dict):
            return metric.get("score") or 0

        return 0