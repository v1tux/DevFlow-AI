# 🚀 DevFlow AI

AI-powered backend platform focused on repository analysis, software quality insights and workflow automation.

---

## 📸 Preview

![Dashboard](./assets/dashboard.png)

---

## ✨ Features

- 🔐 JWT Authentication
- 🛡️ Protected Routes
- 🐘 PostgreSQL Persistence
- 🐳 Dockerized Environment
- ⚡ FastAPI Back-End
- 📊 Technical Repository Analysis
- 🔍 GitHub Repository Scanner
- 📦 ZIP Upload Analysis
- 📄 PDF Report Generation
- ❤️ Healthcheck Endpoint
- 📈 Metrics Endpoint
- ⚙️ Environment Variables
- 🧪 CI/CD Validation Pipeline

---

## 🧠 Tech Stack

### Back-End
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT / OAuth2
- Docker

### Front-End
- React
- Vite
- JavaScript

### DevOps / Quality
- Docker Compose
- GitHub Actions
- Ruff Lint

---

## 🏗️ Architecture

![Architecture](./assets/architecture.png)

---

## 🔐 Authentication Flow

The API uses JWT-based authentication.

### Flow
1. User registers account
2. User logs in
3. JWT token is generated
4. Protected routes require Bearer Token
5. Unauthorized requests return 401

### Protected Routes

- POST `/analyses/repository`
- POST `/analyses/upload`
- GET `/analyses`
- GET `/analyses/{analysis_id}`
- GET `/analyses/{analysis_id}/report`

---

## 📊 API Documentation

![Swagger](./assets/swagger.png)

---

## 📂 Technical Findings

![Findings](./assets/findings.png)

---

## 🐳 Running with Docker

![Docker](./assets/docker.png)

### Start project

```bash
docker compose up --build

Front-End
http://localhost:5173
Swagger Docs
http://localhost:8000/docs
Back-End API
http://localhost:8000
⚙️ Environment Variables

Example .env

APP_NAME=DevFlow AI
APP_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/devflow
CORS_ORIGINS=http://localhost:5173
📈 Roadmap
✅ Completed
JWT Authentication
PostgreSQL Integration
Docker Compose Environment
Protected Routes
Repository Analysis
ZIP Upload Analysis
PDF Report Generation
Swagger/OpenAPI
Metrics & Healthcheck
CI/CD Pipeline
🚧 Next Steps
User Dashboard
Background Queue System
AI-powered Analysis
Deploy in Production
Advanced Metrics
Team Workspaces
Security Score System
👨‍💻 Author

Victor Anderson Lobo Prates

GitHub: https://github.com/v1tux
LinkedIn: https://linkedin.com/in/victor-lobo-prates-196970233
⭐ About

DevFlow AI is a portfolio project focused on demonstrating practical backend engineering skills using modern technologies such as FastAPI, PostgreSQL, Docker, JWT Authentication and scalable architecture concepts.