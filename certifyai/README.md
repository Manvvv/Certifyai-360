# CertifyAI 360

Enterprise certification intelligence platform — 8-agent orchestration pipeline built on the Groq API, FastAPI, PostgreSQL, and React.

---

## Architecture

```
Frontend (React + Vite + Recharts)
         ↓
Backend  (FastAPI)
         ↓
Groq API  (llama-3.3-70b-versatile)
         ↓
PostgreSQL  (learner data, skill gaps)
```

### The 8 Agents

| # | Agent | Role |
|---|-------|------|
| 0 | Master Orchestrator | Coordinates all agents, returns unified output |
| 1 | Learning Path Curator | Personalizes certification roadmap |
| 2 | Study Plan Generator | Creates adaptive weekly/daily schedules |
| 3 | Engagement Agent | Optimises study windows, prevents burnout |
| 4 | Assessment Agent | Generates practice questions, readiness score |
| 5 | AI Mentor Agent | Explains weak areas, provides examples |
| 6 | Success Predictor | Predicts pass probability (0–100 scale) |
| 7 | Manager Insights | Team-level visibility and recommendations |

---

## Quick Start

### 1. Database

```bash
createdb certifyai
psql certifyai -f data/schema.sql
```

### 2. Generate + Seed Synthetic Data

```bash
cd data
pip install faker --break-system-packages
python generate_dataset.py
psql certifyai -f data/seed.sql
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Fill in GROQ_API_KEY and DATABASE_URL

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## API Endpoints

### Orchestration
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orchestrate` | Run all 8 agents for a learner |
| POST | `/api/agents/learning-path` | Agent 1 only |
| POST | `/api/agents/study-plan` | Agents 1+2 |
| POST | `/api/agents/assessment` | Agents 1+4 |
| POST | `/api/agents/predict` | Agents 1+4+6 |

### Dashboard (reads from PostgreSQL)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/overview` | KPI summary |
| GET | `/api/dashboard/learners` | Paginated learner list (filterable) |
| GET | `/api/dashboard/learners/{id}` | Full learner profile + skill gaps |
| GET | `/api/dashboard/skill-gaps` | Heatmap data |
| GET | `/api/dashboard/certifications` | Cert coverage breakdown |
| GET | `/api/dashboard/upcoming-exams` | Exam alerts |
| GET | `/api/dashboard/manager/{id}` | Manager team view |

---

## Orchestrate Request Payload

```json
{
  "role": "Cloud Engineer",
  "certification": "AZ-204",
  "exam_date": "2025-09-01",
  "weekly_hours": 8,
  "skill_level": "Intermediate",
  "practice_score": 65,
  "meeting_hours": 12,
  "focus_hours": 20,
  "preferred_slot": "Morning"
}
```

## Success Prediction Scale

| Score | Tier |
|-------|------|
| 0–40 | High Risk |
| 41–70 | Moderate Risk |
| 71–100 | Exam Ready |

---

## Project Structure

```
certifyai/
├── backend/
│   ├── main.py            # FastAPI app — all 8 agents + endpoints
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Full React dashboard
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── data/
    ├── generate_dataset.py  # Generates 87 synthetic learners
    ├── schema.sql           # (auto-generated)
    ├── seed.sql             # (auto-generated)
    └── learners.json        # (auto-generated)
```
