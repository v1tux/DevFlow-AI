import json
import subprocess
from pathlib import Path

from radon.complexity import cc_visit

from app.utils.file_utils import list_code_files, safe_read


class AnalyzerService:
    def analyze(self, root: Path) -> tuple[int, list[dict]]:
        findings: list[dict] = []
        files = list_code_files(root)

        if not files:
            findings.append(
                self._finding(
                    "repository",
                    "high",
                    None,
                    "Nenhum arquivo de código suportado foi encontrado.",
                    "Confirme se o repositório possui código-fonte em linguagens suportadas.",
                )
            )
            return 45, findings

        findings.extend(self._static_checks(root, files))
        findings.extend(self._python_complexity(root, files))
        findings.extend(self._bandit_scan(root))

        local_metrics = self.get_metrics(findings)
        score = self.calculate_overall_score_from_metrics(local_metrics, findings)

        category_scores = self._build_category_scores(findings)

        for finding in findings:
            finding["category_score"] = category_scores.get(finding.get("category"), 100)

        ranked_findings = self._rank_and_limit_findings(findings)

        return score, ranked_findings

    def get_category_scores(self, findings: list[dict]) -> dict:
        valid_findings = [
            finding for finding in findings
            if finding.get("category")
        ]
        
        return self._build_category_scores(valid_findings)
    
    def get_metrics(self, findings: list[dict], overall_score: int | None = None) -> dict:
        metric_groups = {
            "security": ["security"],
            "architecture": ["architecture", "repository", "dependencies"],
            "maintainability": ["complexity", "reliability", "config"],
            "devops": ["devops"],
            "quality": ["quality", "documentation", "observability"],
        }

        return {
            metric_name: self._build_metric_for_categories(
                findings,
                categories,
                overall_score,
            )
            for metric_name, categories in metric_groups.items()
        }
    
    def calculate_overall_score_from_metrics(
        self,
        metrics: dict,
        findings: list[dict],
    ) -> int:
        weights = {
            "security": 0.35,
            "maintainability": 0.25,
            "architecture": 0.15,
            "quality": 0.15,
            "devops": 0.10,
        }

        weighted_score = 0

        for metric_name, weight in weights.items():
            metric = metrics.get(metric_name, {})
            weighted_score += metric.get("score", 0) * weight

        final_score = round(weighted_score)

        severity_totals = self._severity_breakdown(findings)
        security_score = metrics.get("security", {}).get("score", 100)

        if security_score == 0:
            final_score = min(final_score, 45)

        if severity_totals["critical"] > 0:
            final_score = min(final_score, 45)

        if severity_totals["high"] >= 10:
            final_score = min(final_score, 55)

        if severity_totals["high"] >= 20:
            final_score = min(final_score, 40)

        return max(0, min(100, final_score))
    
    def get_score_explanation(
        self,
        metrics: dict,
        findings: list[dict],
        score: int,
    ) -> list[str]:
        explanations: list[str] = []
        severity_totals = self._severity_breakdown(findings)
        security_score = metrics.get("security", {}).get("score", 100)

        if security_score == 0:
            explanations.append(
                "A nota foi fortemente impactada porque a métrica de segurança ficou em 0."
            )

        if severity_totals["critical"] > 0:
            explanations.append(
                f"Foram encontrados {severity_totals['critical']} achado(s) crítico(s), limitando a nota máxima."
            )

        if severity_totals["high"] >= 20:
            explanations.append(
                f"Foram encontrados {severity_totals['high']} achado(s) de alta severidade, mantendo o projeto em nível crítico."
            )
        elif severity_totals["high"] >= 10:
            explanations.append(
                f"Foram encontrados {severity_totals['high']} achado(s) de alta severidade, reduzindo a confiança geral da análise."
            )

        if score < 50:
            explanations.append(
                "Mesmo com algumas áreas aceitáveis, o risco global do projeto ainda é considerado alto."
            )

        if not explanations:
            explanations.append(
                "A nota geral foi calculada com base na média ponderada das métricas técnicas."
            )

        return explanations

    def _has_literal_assignment(self, content: str, keywords: list[str]) -> bool:
        lowered_keywords = [keyword.lower() for keyword in keywords]

        for line in content.splitlines():
            clean_line = line.strip()
            lower_line = clean_line.lower()

            if not clean_line or clean_line.startswith("#"):
                continue

            has_keyword = any(keyword in lower_line for keyword in lowered_keywords)
            if not has_keyword:
                continue

            has_assignment = "=" in clean_line or ":" in clean_line
            has_literal_value = '"' in clean_line or "'" in clean_line

            if has_assignment and has_literal_value:
                return True

        return False

    def _uses_environment_variable(self, content: str) -> bool:
        environment_patterns = [
            "os.getenv",
            "os.environ",
            "getenv(",
            "settings.",
            "config.",
            "env(",
        ]

        lower = content.lower()

        return any(pattern in lower for pattern in environment_patterns)

    def _is_schema_or_model_file(self, relative_path: str) -> bool:
        lower_path = relative_path.lower()

        return any(
            keyword in lower_path
            for keyword in ["schema", "schemas", "model", "models", "dto", "request"]
        )
    
    def _static_checks(self, root: Path, files: list[Path]) -> list[dict]:
        findings: list[dict] = []

        readme = root / "README.md"
        dockerfile = root / "Dockerfile"
        docker_compose = root / "docker-compose.yml"
        env_example = root / ".env.example"
        gitignore = root / ".gitignore"
        requirements = root / "requirements.txt"
        pyproject = root / "pyproject.toml"
        package_json = root / "package.json"
        dockerignore = root / ".dockerignore"
        github_workflows = root / ".github" / "workflows"

        if not readme.exists():
            findings.append(
                self._finding(
                    "documentation",
                    "medium",
                    "README.md",
                    "README.md ausente.",
                    "Adicione um README com objetivo, instalação, arquitetura, endpoints e decisões técnicas.",
                )
            )

        if not dockerfile.exists():
            findings.append(
                self._finding(
                    "devops",
                    "medium",
                    "Dockerfile",
                    "Dockerfile ausente.",
                    "Adicione um Dockerfile para padronizar ambiente e facilitar deploy.",
                )
            )

        if not docker_compose.exists():
            findings.append(
                self._finding(
                    "devops",
                    "low",
                    "docker-compose.yml",
                    "docker-compose.yml ausente.",
                    "Considere adicionar Docker Compose para subir aplicação e dependências locais com facilidade.",
                )
            )

        if not dockerignore.exists():
            findings.append(
                self._finding(
                    "devops",
                    "low",
                    ".dockerignore",
                    ".dockerignore ausente.",
                    "Adicione .dockerignore para evitar copiar caches, ambientes virtuais, node_modules e arquivos sensíveis para a imagem Docker.",
                    confidence="high",
                    evidence="Arquivo .dockerignore não encontrado na raiz do projeto.",
                    source="devops_check",
                )
            )   

        if not env_example.exists():
            findings.append(
                self._finding(
                    "security",
                    "low",
                    ".env.example",
                    "Arquivo .env.example ausente.",
                    "Documente variáveis de ambiente sem expor segredos.",
                )
            )

        if not github_workflows.exists():
            findings.append(
                self._finding(
                    "devops",
                    "medium",
                    ".github/workflows",
                    "Pipeline de CI/CD não encontrado.",
                    "Adicione GitHub Actions ou outro pipeline para executar testes, lint e validações antes do deploy.",
                    confidence="medium",
                    evidence="Diretório .github/workflows não encontrado.",
                    source="devops_check",
                )
            )

        if not gitignore.exists():
            findings.append(
                self._finding(
                    "repository",
                    "medium",
                    ".gitignore",
                    ".gitignore ausente.",
                    "Adicione .gitignore para evitar versionar ambientes virtuais, caches, builds e arquivos sensíveis.",
                )
            )

        has_dependency_file = requirements.exists() or pyproject.exists() or package_json.exists()

        if not has_dependency_file:
            findings.append(
                self._finding(
                    "dependencies",
                    "medium",
                    None,
                    "Nenhum arquivo de dependências conhecido encontrado.",
                    "Adicione requirements.txt, pyproject.toml ou package.json para facilitar instalação e reprodução do ambiente.",
                )
            )

        for file in files:
            relative = str(file.relative_to(root))
            content = safe_read(file)
            lower = content.lower()
            lines = content.splitlines()

            if len(lines) > 450:
                findings.append(
                    self._finding(
                        "architecture",
                        "medium",
                        relative,
                        "Arquivo muito extenso.",
                        "Divida responsabilidades em módulos menores para melhorar manutenção.",
                    )
                )

            sensitive_keywords = [
                "password",
                "secret_key",
                "api_key",
                "access_token",
                "refresh_token",
                "private_key",
                "client_secret",
            ]

            has_sensitive_keyword = any(
                keyword in lower for keyword in sensitive_keywords
            )

            if has_sensitive_keyword:
                uses_env = self._uses_environment_variable(content)
                has_literal_secret = self._has_literal_assignment(content, sensitive_keywords)
                is_schema_or_model = self._is_schema_or_model_file(relative)

                if uses_env and not has_literal_secret:
                    continue

                if is_schema_or_model and not has_literal_secret:
                    findings.append(
                        self._finding(
                            "security",
                            "medium",
                            relative,
                            "Campo sensível identificado em schema/modelo.",
                            "Garanta que campos sensíveis sejam validados, protegidos e nunca retornados em respostas públicas.",
                            confidence="medium",
                            evidence="Termo sensível encontrado em arquivo de schema/modelo, sem evidência clara de segredo hardcoded.",
                            source="sensitive_field_detector",
                        )
                    )
                elif has_literal_secret:
                    findings.append(
                        self._finding(
                            "security",
                            "high",
                            relative,
                            "Possível segredo hardcoded encontrado.",
                            "Remova valores sensíveis do código e use variáveis de ambiente ou secret manager.",
                            confidence="high",
                            evidence="Termo sensível encontrado com atribuição direta para valor literal.",
                            source="secret_detector",
                        )
                    )
                else:
                    findings.append(
                        self._finding(
                            "security",
                            "medium",
                            relative,
                            "Uso de termo sensível encontrado.",
                            "Revise se o valor sensível está sendo tratado de forma segura.",
                            confidence="low",
                            evidence="Termo sensível encontrado, mas sem evidência suficiente de segredo hardcoded.",
                            source="sensitive_field_detector",
                        )
                    )

            if "todo" in lower or "fixme" in lower:
                findings.append(
                    self._finding(
                        "quality",
                        "low",
                        relative,
                        "Comentários TODO/FIXME encontrados.",
                        "Transforme pendências em issues ou resolva antes de produção.",
                    )
                )

            if "console.log" in content or "print(" in content:
                findings.append(
                    self._finding(
                        "observability",
                        "low",
                        relative,
                        "Logs simples encontrados.",
                        "Use logger estruturado com níveis de severidade.",
                    )
                )

            if "except:" in content:
                findings.append(
                    self._finding(
                        "reliability",
                        "medium",
                        relative,
                        "Tratamento genérico de exceção encontrado.",
                        "Capture exceções específicas e registre contexto do erro.",
                    )
                )

            if "eval(" in content:
                findings.append(
                    self._finding(
                        "security",
                        "critical",
                        relative,
                        "Uso de eval encontrado.",
                        "Evite eval por risco de execução de código malicioso.",
                    )
                )

            if "localhost" in lower or "127.0.0.1" in lower:
                findings.append(
                    self._finding(
                        "config",
                        "low",
                        relative,
                        "Referência fixa a localhost encontrada.",
                        "Prefira configurar URLs por variável de ambiente para facilitar deploy.",
                    )
                )

        return findings

    def _python_complexity(self, root: Path, files: list[Path]) -> list[dict]:
        findings: list[dict] = []

        for file in [f for f in files if f.suffix == ".py"]:
            content = safe_read(file, 50000)

            try:
                blocks = cc_visit(content)
            except Exception:
                continue

            for block in blocks:
                if block.complexity >= 10:
                    findings.append(
                        self._finding(
                            "complexity",
                            "high" if block.complexity >= 15 else "medium",
                            str(file.relative_to(root)),
                            f"Função/classe '{block.name}' com complexidade ciclomática {block.complexity}.",
                            "Refatore condicionais, extraia funções e reduza responsabilidades.",
                        )
                    )

        return findings

    def _bandit_scan(self, root: Path) -> list[dict]:
        findings: list[dict] = []

        try:
            result = subprocess.run(
                ["bandit", "-r", str(root), "-f", "json", "-q"],
                capture_output=True,
                text=True,
                timeout=25,
                check=False,
            )

            data = json.loads(result.stdout or "{}")

            for item in data.get("results", [])[:30]:
                findings.append(
                    self._finding(
                        "security",
                        self._map_bandit(item.get("issue_severity", "LOW")),
                        item.get("filename"),
                        item.get("issue_text", "Possível vulnerabilidade encontrada."),
                        "Revise a vulnerabilidade apontada pelo scanner e aplique correção segura.",
                    )
                )

        except Exception:
            pass

        return findings

    def _build_metric_for_categories(
        self,
        findings: list[dict],
        categories: list[str],
        overall_score: int | None = None,
    ) -> dict:
        related_findings = [
            finding for finding in findings
            if finding.get("category") in categories
        ]

        severity = self._severity_breakdown(related_findings)

        penalty = sum(
            self._severity_penalty(finding.get("severity", "low"))
            for finding in related_findings
        )

        local_score = max(0, min(100, 100 - penalty))

        if overall_score is None:
            final_score = local_score
        else:
            normalized_overall_score = max(0, min(100, overall_score))

            contextual_score = round(
                (local_score * 0.65) + (normalized_overall_score * 0.35)
            )

            final_score = min(local_score, contextual_score)

        return {
            "score": final_score,
            "findings_count": len(related_findings),
            "severity": severity,
        }

    def _severity_breakdown(self, findings: list[dict]) -> dict:
        breakdown = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
        }

        for finding in findings:
            severity = finding.get("severity", "low")

            if severity in breakdown:
                breakdown[severity] += 1

        return breakdown

    def _build_category_scores(self, findings: list[dict]) -> dict:
        categories = {
            "security",
            "architecture",
            "complexity",
            "devops",
            "quality",
            "documentation",
            "dependencies",
            "repository",
            "observability",
            "reliability",
            "config",
        }

        return {
            category: self._category_score(findings, category)
            for category in categories
        }

    def _category_score(self, findings: list[dict], category: str) -> int:
        category_findings = [
            finding for finding in findings
            if finding.get("category") == category
        ]

        penalty = sum(
            self._severity_penalty(finding.get("severity", "low"))
            for finding in category_findings
        )

        return max(0, min(100, 100 - penalty))

    def _calculate_score_penalty(self, findings: list[dict]) -> int:
        severity_count = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
        }

        for finding in findings:
            severity = finding.get("severity", "low")
            if severity in severity_count:
                severity_count[severity] += 1

        penalty = 0
        penalty += min(severity_count["critical"] * 12, 35)
        penalty += min(severity_count["high"] * 7, 30)
        penalty += min(severity_count["medium"] * 4, 25)
        penalty += min(severity_count["low"] * 1, 10)

        return penalty

    def _map_bandit(self, severity: str) -> str:
        return {
            "HIGH": "critical",
            "MEDIUM": "high",
            "LOW": "medium",
        }.get(severity.upper(), "low")

    def _severity_penalty(self, severity: str) -> int:
        return {
            "critical": 15,
            "high": 9,
            "medium": 5,
            "low": 2,
        }.get(severity, 1)

    def _priority_from_severity(self, severity: str) -> str:
        return {
            "critical": "Corrigir imediatamente",
            "high": "Alta prioridade",
            "medium": "Média prioridade",
            "low": "Baixa prioridade",
        }.get(severity, "Revisar")
    
    def _rank_and_limit_findings(self, findings: list[dict], limit: int = 80) -> list[dict]:
        severity_rank = {
            "critical": 0,
            "high": 1,
            "medium": 2,
            "low": 3,
        }

        source_rank = {
            "secret_detector": 0,
            "bandit": 1,
            "sensitive_field_detector": 2,
            "static_check": 3,
            "complexity": 4,
        }

        grouped_findings: dict[
            tuple[str | None, str | None, str | None, str | None],
            dict,
        ] = {}

        for finding in findings:
            key = (
                finding.get("category"),
                finding.get("severity"),
                finding.get("message"),
                finding.get("recommendation"),
            )

            current_file = finding.get("file")

            if key not in grouped_findings:
                grouped_finding = finding.copy()
                grouped_finding["occurrences"] = 1
                grouped_finding["files"] = [current_file] if current_file else []
                grouped_findings[key] = grouped_finding
                continue

            grouped_finding = grouped_findings[key]
            grouped_finding["occurrences"] = grouped_finding.get("occurrences", 1) + 1

            if current_file and current_file not in grouped_finding.get("files", []):
                grouped_finding.setdefault("files", []).append(current_file)

        ranked_findings = list(grouped_findings.values())

        ranked_findings.sort(
            key=lambda finding: (
                severity_rank.get(finding.get("severity"), 99),
                source_rank.get(finding.get("source"), 99),
                finding.get("category") or "",
                -(finding.get("occurrences") or 1),
                finding.get("file") or "",
            )
        )

        return ranked_findings[:limit]

    def _finding(
        self,
        category: str,
        severity: str,
        file: str | None,
        message: str,
        recommendation: str,
        confidence: str = "medium",
        evidence: str | None = None,
        source: str = "static_check",
    ) -> dict:
        return {
            "category": category,
            "severity": severity,
            "file": file,
            "message": message,
            "recommendation": recommendation,
            "priority": self._priority_from_severity(severity),
            "confidence": confidence,
            "evidence": evidence,
            "source": source,
        }