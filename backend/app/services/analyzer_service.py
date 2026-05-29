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

        penalty = self._calculate_score_penalty(findings)
        score = max(0, min(100, 100 - penalty))

        category_scores = self._build_category_scores(findings)

        for finding in findings:
            finding["category_score"] = category_scores.get(finding.get("category"), 100)

        return score, findings[:80]

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

            if "password" in lower and ("=" in content or ":" in content):
                findings.append(
                    self._finding(
                        "security",
                        "high",
                        relative,
                        "Possível credencial ou senha hardcoded.",
                        "Use variáveis de ambiente ou secret manager.",
                    )
                )

            if "secret_key" in lower or "api_key" in lower or "access_token" in lower:
                findings.append(
                    self._finding(
                        "security",
                        "high",
                        relative,
                        "Possível chave, token ou segredo hardcoded.",
                        "Remova segredos do código e use variáveis de ambiente.",
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

    def _finding(
        self,
        category: str,
        severity: str,
        file: str | None,
        message: str,
        recommendation: str,
    ) -> dict:
        return {
            "category": category,
            "severity": severity,
            "file": file,
            "message": message,
            "recommendation": recommendation,
            "priority": self._priority_from_severity(severity),
        }