from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.models.analysis import Analysis


class ReportService:
    def build_pdf(self, analysis: Analysis) -> bytes:
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        width, height = A4
        margin_x = 50
        y = height - 60

        self._draw_header(pdf, width, height)

        y = height - 145

        pdf.setFillColor(colors.black)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(margin_x, y, analysis.project_name)

        y -= 22

        pdf.setFont("Helvetica", 10)
        pdf.setFillColor(colors.HexColor("#4b5563"))
        pdf.drawString(
            margin_x,
            y,
            f"Generated at: {datetime.utcnow().strftime('%d/%m/%Y %H:%M UTC')}",
        )

        y -= 45

        self._draw_score_card(pdf, margin_x, y, analysis.score)

        y -= 95

        y = self._draw_section_title(pdf, margin_x, y, "Executive Summary")
        y = self._draw_wrapped_text(pdf, margin_x, y, analysis.summary, 105, 10)

        y -= 25

        y = self._draw_section_title(pdf, margin_x, y, "Top Findings")

        findings = [
            finding
            for finding in analysis.findings
            if finding.get("severity") and finding.get("category")
        ]

        for finding in findings[:20]:
            if y < 110:
                pdf.showPage()
                self._draw_header(pdf, width, height)
                y = height - 145
                y = self._draw_section_title(pdf, margin_x, y, "Top Findings")

            y = self._draw_finding(pdf, margin_x, y, finding)

        self._draw_footer(pdf)

        pdf.save()
        buffer.seek(0)

        return buffer.read()

    def _draw_header(self, pdf: canvas.Canvas, width: float, height: float) -> None:
        pdf.setFillColor(colors.HexColor("#111827"))
        pdf.rect(0, height - 110, width, 110, fill=1, stroke=0)

        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 24)
        pdf.drawString(50, height - 55, "DevFlow AI")

        pdf.setFont("Helvetica", 11)
        pdf.drawString(50, height - 78, "Technical Analysis Executive Report")

    def _draw_score_card(
        self,
        pdf: canvas.Canvas,
        x: int,
        y: float,
        score: int,
    ) -> None:
        card_color = colors.HexColor("#22c55e")

        if score < 70:
            card_color = colors.HexColor("#f59e0b")

        if score < 50:
            card_color = colors.HexColor("#ef4444")

        pdf.setFillColor(card_color)
        pdf.roundRect(x, y - 50, 170, 70, 14, fill=1, stroke=0)

        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 30)
        pdf.drawString(x + 20, y - 12, f"{score}/100")

        pdf.setFont("Helvetica", 11)
        pdf.drawString(x + 20, y - 34, "Overall Score")

    def _draw_section_title(
        self,
        pdf: canvas.Canvas,
        x: int,
        y: float,
        title: str,
    ) -> float:
        pdf.setFillColor(colors.black)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(x, y, title)

        return y - 22

    def _draw_finding(
        self,
        pdf: canvas.Canvas,
        x: int,
        y: float,
        finding: dict,
    ) -> float:
        severity = finding.get("severity", "low")
        category = finding.get("category", "general").upper()
        file_name = finding.get("file") or "Projeto"
        message = finding.get("message", "")
        recommendation = finding.get("recommendation", "")

        severity_color = self._severity_color(severity)

        pdf.setFillColor(severity_color)
        pdf.roundRect(x, y - 3, 70, 18, 6, fill=1, stroke=0)

        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 7)
        pdf.drawString(x + 10, y + 2, severity.upper())

        pdf.setFillColor(colors.black)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawString(x + 85, y + 2, category)

        y -= 20

        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawString(x + 10, y, file_name)

        y -= 14

        pdf.setFont("Helvetica", 9)
        y = self._draw_wrapped_text(pdf, x + 10, y, message, 88, 12)

        if recommendation:
            y -= 3
            pdf.setFont("Helvetica-Bold", 9)
            pdf.drawString(x + 10, y, "Recommendation:")

            pdf.setFont("Helvetica", 9)
            y = self._draw_wrapped_text(pdf, x + 100, y, recommendation, 72, 12)

        return y - 16

    def _draw_wrapped_text(
        self,
        pdf: canvas.Canvas,
        x: int,
        y: float,
        text: str,
        width: int,
        line_height: int,
    ) -> float:
        pdf.setFillColor(colors.black)
        pdf.setFont("Helvetica", 8)

        for line in self._wrap(text, width):
            if y < 60:
                pdf.showPage()
                self._draw_header(pdf, A4[0], A4[1])
                y = A4[1] - 145
                pdf.setFont("Helvetica", 8)

            pdf.drawString(x, y, line)
            y -= line_height

        return y

    def _draw_footer(self, pdf: canvas.Canvas) -> None:
        pdf.setFillColor(colors.HexColor("#6b7280"))
        pdf.setFont("Helvetica", 8)
        pdf.drawString(
            50,
            30,
            "Generated by DevFlow AI • Intelligent Repository Analysis Platform",
        )

    def _severity_color(self, severity: str):
        return {
            "critical": colors.HexColor("#ef4444"),
            "high": colors.HexColor("#f97316"),
            "medium": colors.HexColor("#f59e0b"),
            "low": colors.HexColor("#3b82f6"),
        }.get(severity, colors.HexColor("#3b82f6"))

    def _wrap(self, text: str, width: int) -> list[str]:
        words = str(text).split()
        lines = []
        current = ""

        for word in words:
            if len(current) + len(word) + 1 > width:
                if current:
                    lines.append(current)
                current = word
            else:
                current = f"{current} {word}".strip()

        if current:
            lines.append(current)

        return lines