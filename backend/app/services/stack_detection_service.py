import json
from pathlib import Path

from app.utils.file_utils import safe_read


class StackDetectionService:
    def detect(self, root: Path) -> dict:
        package_data = self._read_package_json(root)

        return {
            "backend": self._detect_backend(root),
            "frontend": self._detect_frontend(root, package_data),
            "database": self._detect_database(root),
            "devops": self._detect_devops(root),
            "ci_cd": self._detect_ci_cd(root),
            "architecture": self._detect_architecture(root),
        }

    def _read_package_json(self, root: Path) -> dict:
        package_json = root / "package.json"

        if not package_json.exists():
            return {}

        try:
            return json.loads(safe_read(package_json))
        except Exception:
            return {}

    def _detect_backend(self, root: Path) -> list[str]:
        detected = []

        requirements = safe_read(root / "requirements.txt").lower()
        pyproject = safe_read(root / "pyproject.toml").lower()

        if "fastapi" in requirements or "fastapi" in pyproject:
            detected.append("FastAPI")

        if "django" in requirements or "django" in pyproject:
            detected.append("Django")

        if "flask" in requirements or "flask" in pyproject:
            detected.append("Flask")

        if (root / "package.json").exists():
            package_content = safe_read(root / "package.json").lower()

            if "express" in package_content:
                detected.append("Express.js")

            if "nestjs" in package_content or "@nestjs" in package_content:
                detected.append("NestJS")

        if not detected and list(root.rglob("*.py")):
            detected.append("Python")

        if not detected and list(root.rglob("*.js")):
            detected.append("Node.js/JavaScript")

        return detected

    def _detect_frontend(self, root: Path, package_data: dict) -> list[str]:
        detected = []

        dependencies = {
            **package_data.get("dependencies", {}),
            **package_data.get("devDependencies", {}),
        }

        if "react" in dependencies:
            detected.append("React")

        if "vite" in dependencies:
            detected.append("Vite")

        if "next" in dependencies:
            detected.append("Next.js")

        if "vue" in dependencies:
            detected.append("Vue")

        if "angular" in dependencies or "@angular/core" in dependencies:
            detected.append("Angular")

        if not detected and list(root.rglob("*.jsx")):
            detected.append("React/JSX")

        return detected

    def _detect_database(self, root: Path) -> list[str]:
        detected = []

        all_text = self._read_project_text(root)

        if "postgres" in all_text or "postgresql" in all_text:
            detected.append("PostgreSQL")

        if "mysql" in all_text:
            detected.append("MySQL")

        if "mongodb" in all_text or "mongo" in all_text:
            detected.append("MongoDB")

        if "sqlite" in all_text:
            detected.append("SQLite")

        if "redis" in all_text:
            detected.append("Redis")

        return detected

    def _detect_devops(self, root: Path) -> list[str]:
        detected = []

        if (root / "Dockerfile").exists():
            detected.append("Docker")

        if (root / "docker-compose.yml").exists() or (root / "compose.yml").exists():
            detected.append("Docker Compose")

        if (root / "kubernetes").exists() or (root / "k8s").exists():
            detected.append("Kubernetes")

        return detected

    def _detect_ci_cd(self, root: Path) -> list[str]:
        detected = []

        if (root / ".github" / "workflows").exists():
            detected.append("GitHub Actions")

        if (root / ".gitlab-ci.yml").exists():
            detected.append("GitLab CI")

        if (root / "Jenkinsfile").exists():
            detected.append("Jenkins")

        return detected

    def _detect_architecture(self, root: Path) -> list[str]:
        detected = []

        common_dirs = [path.name for path in root.iterdir() if path.is_dir()]

        if "backend" in common_dirs and "frontend" in common_dirs:
            detected.append("Monorepo Frontend/Backend")

        if "app" in common_dirs or "src" in common_dirs:
            detected.append("Layered/Modular Structure")

        if (root / "app" / "services").exists() or (root / "src" / "services").exists():
            detected.append("Service Layer")

        if (root / "app" / "models").exists() or (root / "src" / "models").exists():
            detected.append("Domain Models")

        return detected

    def _read_project_text(self, root: Path) -> str:
        interesting_files = [
            "requirements.txt",
            "pyproject.toml",
            "package.json",
            "docker-compose.yml",
            "compose.yml",
            ".env.example",
            "README.md",
        ]

        content = []

        for file_name in interesting_files:
            path = root / file_name

            if path.exists():
                content.append(safe_read(path, 20000).lower())

        return "\n".join(content)