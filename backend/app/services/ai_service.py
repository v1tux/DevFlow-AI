from app.core.config import get_settings

settings = get_settings()


class AIService:
    def generate_summary(self, project_name: str, findings: list[dict], score: int) -> str:
        critical = len([f for f in findings if f.get("severity") == "critical"])
        high = len([f for f in findings if f.get("severity") == "high"])
        medium = len([f for f in findings if f.get("severity") == "medium"])

        categories = {f.get("category") for f in findings if f.get("category")}

        if score >= 85:
            level = "excelente"
            intro = "O projeto demonstra maturidade técnica, boa organização arquitetural e boas práticas de desenvolvimento."
        elif score >= 70:
            level = "boa"
            intro = "O projeto apresenta uma base sólida, com poucos pontos críticos e arquitetura relativamente organizada."
        elif score >= 50:
            level = "intermediária"
            intro = "O projeto possui potencial, porém apresenta problemas estruturais e técnicos que merecem atenção."
        else:
            level = "crítica"
            intro = "O projeto apresenta riscos técnicos relevantes e necessita melhorias para atingir um nível mais profissional."

        insights = []

        if "security" in categories:
            insights.append("foram identificados pontos de atenção relacionados à segurança")

        if "complexity" in categories:
            insights.append("há indícios de alta complexidade ciclomática em partes do código")

        if "architecture" in categories:
            insights.append("existem oportunidades de melhorar modularização e separação de responsabilidades")

        if "documentation" in categories:
            insights.append("a documentação técnica pode ser expandida")

        if "devops" in categories:
            insights.append("há espaço para evolução na padronização DevOps e deploy")

        insights_text = ""

        if insights:
            insights_text = " Além disso, " + ", ".join(insights) + "."

        return (
            f"O projeto {project_name} recebeu score {score}/100 e apresenta qualidade {level}. "
            f"{intro} "
            f"Foram encontrados {critical} pontos críticos, {high} altos e {medium} médios."
            f"{insights_text}"
        )