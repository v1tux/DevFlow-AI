class AIReviewService:
    def enrich_analysis(
        self,
        project_name: str,
        score: int,
        metrics: dict,
        findings: list[dict],
    ) -> dict:
        severity_totals = self._count_severities(findings)
        main_risks = self._extract_main_risks(metrics, findings)

        return {
            "executive_summary": self._build_executive_summary(
                project_name,
                score,
                severity_totals,
                main_risks,
            ),
            "main_risks": main_risks,
            "recommended_next_steps": self._build_next_steps(metrics),
        }

    def _count_severities(self, findings: list[dict]) -> dict:
        totals = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
        }

        for finding in findings:
            severity = finding.get("severity")

            if severity in totals:
                totals[severity] += 1

        return totals

    def _extract_main_risks(self, metrics: dict, findings: list[dict]) -> list[str]:
        risks: list[str] = []

        security_score = metrics.get("security", {}).get("score", 100)
        maintainability_score = metrics.get("maintainability", {}).get("score", 100)
        architecture_score = metrics.get("architecture", {}).get("score", 100)
        devops_score = metrics.get("devops", {}).get("score", 100)
        quality_score = metrics.get("quality", {}).get("score", 100)

        if security_score < 60:
            risks.append(
                "A segurança exige atenção, pois foram encontrados sinais de risco em campos sensíveis, segredos, validações ou padrões inseguros."
            )

        if maintainability_score < 60:
            risks.append(
                "A manutenibilidade está comprometida por possíveis problemas de complexidade, organização, confiabilidade ou configuração."
            )

        if architecture_score < 60:
            risks.append(
                "A arquitetura pode ser melhorada com uma separação mais clara de responsabilidades, dependências e estrutura do projeto."
            )

        if devops_score < 70:
            risks.append(
                "A maturidade DevOps ainda pode evoluir com melhores práticas de Docker, variáveis de ambiente, automação e CI/CD."
            )

        if quality_score < 70:
            risks.append(
                "A qualidade geral pode ser fortalecida com documentação, testes, observabilidade e padronização técnica."
            )

        high_confidence_findings = [
            finding
            for finding in findings
            if finding.get("confidence") == "high"
            and finding.get("severity") in {"critical", "high"}
        ]

        if high_confidence_findings:
            risks.append(
                "Existem achados de alta confiança que devem ser revisados com prioridade, pois indicam problemas mais concretos."
            )

        if not risks:
            risks.append(
                "Nenhum risco técnico dominante foi identificado, mas melhorias incrementais ainda são recomendadas para manter a qualidade do projeto."
            )

        return risks[:5]

    def _build_executive_summary(
        self,
        project_name: str,
        score: int,
        severity_totals: dict,
        main_risks: list[str],
    ) -> str:
        risk_level = self._get_risk_level(score)

        return (
            f"O projeto {project_name} recebeu score {score}/100, "
            f"indicando um nível de qualidade técnica {risk_level}. "
            f"A análise identificou {severity_totals['critical']} achado(s) crítico(s), "
            f"{severity_totals['high']} alto(s), {severity_totals['medium']} médio(s) "
            f"e {severity_totals['low']} baixo(s). "
            f"Principais pontos de atenção: {' '.join(main_risks)}"
        )

    def _build_next_steps(self, metrics: dict) -> list[str]:
        steps: list[str] = []

        if metrics.get("security", {}).get("score", 100) < 70:
            steps.append(
                "Revisar primeiro os achados de segurança, principalmente segredos, campos sensíveis e execução insegura de código."
            )

        if metrics.get("maintainability", {}).get("score", 100) < 70:
            steps.append(
                "Reduzir complexidade, melhorar tratamento de erros e organizar melhor responsabilidades antes de adicionar novas funcionalidades."
            )

        if metrics.get("architecture", {}).get("score", 100) < 70:
            steps.append(
                "Revisar a arquitetura do projeto, separando melhor services, models, schemas, rotas e dependências."
            )

        if metrics.get("devops", {}).get("score", 100) < 70:
            steps.append(
                "Melhorar a maturidade DevOps adicionando boas práticas de Docker, .env.example, .dockerignore e validação automatizada."
            )

        if metrics.get("quality", {}).get("score", 100) < 70:
            steps.append(
                "Fortalecer qualidade geral com documentação, testes automatizados, observabilidade e padronização de código."
            )

        if not steps:
            steps.append(
                "Manter a evolução contínua do projeto com testes, documentação, automação e revisões técnicas periódicas."
            )

        return steps[:5]

    def _get_risk_level(self, score: int) -> str:
        if score < 50:
            return "crítico"

        if score < 70:
            return "moderado"

        if score < 85:
            return "controlado"

        return "saudável"