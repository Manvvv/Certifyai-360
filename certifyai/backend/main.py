"""
CertifyAI 360 — FastAPI Backend
Runs the 8-agent orchestration pipeline via Groq API (llama-3.3-70b-versatile).

Install:  pip install fastapi uvicorn asyncpg pydantic python-dotenv groq
Run:      uvicorn main:app --reload --port 8000
Docs:     http://localhost:8000/docs
"""

import os
import json
import random
import asyncio
from datetime import date, datetime, timedelta
from typing import Optional, Any

from groq import Groq
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="CertifyAI 360 API",
    description="Enterprise certification intelligence — 8-agent orchestration pipeline",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/certifyai")
# URL-encode any special characters in the DATABASE_URL (e.g. @ in password)
import urllib.parse as _urlparse
_parsed = _urlparse.urlparse(DATABASE_URL)
if _parsed.password and '@' in _parsed.password:
    _safe_pass = _urlparse.quote(_parsed.password, safe='')
    DATABASE_URL = DATABASE_URL.replace(f':{_parsed.password}@', f':{_safe_pass}@', 1)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

client = Groq(api_key=GROQ_API_KEY)
db_pool = None
DB_AVAILABLE = False


# ─── DB pool (optional) ────────────────────────────────────────────────────────

async def get_db():
    if not DB_AVAILABLE or db_pool is None:
        yield None
        return
    async with db_pool.acquire() as conn:
        yield conn


@app.on_event("startup")
async def startup():
    global db_pool, DB_AVAILABLE
    try:
        import asyncpg
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10, timeout=5)
        DB_AVAILABLE = True
        print("[OK] PostgreSQL connected successfully")
    except Exception as e:
        DB_AVAILABLE = False
        print(f"[WARNING] PostgreSQL not available - running in demo mode (AI agents still fully functional): {e}")


@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class LearnerInput(BaseModel):
    role: str
    certification: str
    exam_date: str
    weekly_hours: int = Field(..., ge=1, le=40)
    skill_level: str = Field(..., pattern="^(Beginner|Intermediate|Advanced)$")
    practice_score: int = Field(..., ge=0, le=100)
    meeting_hours: int = Field(default=10, ge=0, le=40)
    focus_hours: int = Field(default=20, ge=0, le=40)
    preferred_slot: str = Field(default="Morning")


class AgentResponse(BaseModel):
    agent: str
    output: dict
    tokens_used: int
    latency_ms: float


class OrchestrationResult(BaseModel):
    learner_profile: dict
    certification_roadmap: dict
    study_schedule: dict
    engagement_strategy: dict
    assessment_results: dict
    success_prediction: dict
    manager_insights: dict
    executive_briefing: Optional[dict] = None
    foundry_iq: Optional[dict] = None
    mentor_insights: Optional[dict] = None
    recommended_actions: list[str]
    total_tokens: int


# ─── Agent helper ─────────────────────────────────────────────────────────────

def call_groq(system_prompt: str, user_message: str, max_tokens: int = 1500) -> tuple[dict, int]:
    """Call Groq and return parsed JSON + token count."""
    import re
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=max_tokens,
        messages=[
            {
                "role": "system",
                "content": system_prompt + "\n\nAlways respond with valid JSON only. No markdown fences, no explanation outside the JSON object.",
            },
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content.strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        parsed = json.loads(match.group()) if match else {"raw": raw}
    tokens = response.usage.prompt_tokens + response.usage.completion_tokens
    return parsed, tokens


# ─── Master Orchestrator System Prompt ────────────────────────────────────────

ORCHESTRATOR_SYSTEM_PROMPT = """You are CertifyAI 360 Orchestrator. You coordinate 8 specialized agents:
1. Learning Path Curator Agent
2. Study Plan Generator Agent
3. Engagement Agent
4. Assessment Agent
5. Success Predictor Agent
6. AI Mentor Agent
7. Manager Insights Agent
8. Executive Briefing Agent

For every learner request:
STEP 1: Analyze learner profile.
STEP 2: Send role, certification target, and skill level to Learning Path Curator.
STEP 3: Pass learning path to Study Plan Generator.
STEP 4: Pass workload signals, meeting hours, focus hours, and preferred learning slot to Engagement Agent.
STEP 5: Generate assessment through Assessment Agent.
STEP 6: Evaluate readiness using Success Predictor Agent.
STEP 7: Generate manager-level insights using Manager Insights Agent.
STEP 8: Generate executive summary using Executive Briefing Agent.

Display the workflow visibly.

Output Format:
AGENT EXECUTION TRACE
Step 1: Learning Path Curator Completed
Step 2: Study Plan Generator Completed
Step 3: Engagement Agent Completed
Step 4: Assessment Agent Completed
Step 5: Success Predictor Completed
Step 6: Manager Insights Completed
Step 7: Executive Briefing Completed

FINAL RESULTS
Learner Profile
Learning Roadmap
Study Plan
Engagement Recommendations
Assessment Results
Pass Probability
Manager Insights
Executive Summary"""

# ─── Agent 1: Learning Path Curator ──────────────────────────────────────────

CURATOR_SYSTEM = """You are an Enterprise Learning Path Curator.
Recommend personalized certification learning paths based on role and skill level.
Return JSON with keys: certification, required_skills (list), learning_modules (list of {title, hours, priority}),
learning_sequence (ordered list), estimated_hours (int), key_topics (list)."""


def agent_learning_path(learner: LearnerInput) -> tuple[dict, int]:
    prompt = f"""Role: {learner.role}
Certification: {learner.certification}
Current Skill Level: {learner.skill_level}
Practice Score: {learner.practice_score}/100
Weekly Available Hours: {learner.weekly_hours}

Create a personalized learning path."""
    return call_groq(CURATOR_SYSTEM, prompt, 1200)


# ─── Agent 2: Study Plan Generator ───────────────────────────────────────────

STUDY_PLAN_SYSTEM = """You are an Enterprise Study Planning Agent.
Create realistic study schedules that prevent burnout.
Return JSON with keys: weekly_plan (list of {week, focus, hours, topics}),
daily_schedule (list of {day, slot, duration_mins, activity}),
milestones (list of {week, goal, metric}),
recovery_strategy (string), total_weeks (int)."""


def agent_study_plan(learner: LearnerInput, learning_path: dict) -> tuple[dict, int]:
    exam = date.fromisoformat(learner.exam_date)
    weeks_left = max(1, (exam - date.today()).days // 7)
    prompt = f"""Certification: {learner.certification}
Exam Date: {learner.exam_date} ({weeks_left} weeks away)
Weekly Available Hours: {learner.weekly_hours}
Meeting Hours/Week: {learner.meeting_hours}
Preferred Learning Slot: {learner.preferred_slot}
Total Estimated Hours Required: {learning_path.get('estimated_hours', 80)}
Key Modules: {json.dumps(learning_path.get('learning_modules', [])[:5])}

Create a realistic weekly and daily study plan."""
    return call_groq(STUDY_PLAN_SYSTEM, prompt, 1200)


# ─── Agent 3: Engagement Agent ────────────────────────────────────────────────

ENGAGEMENT_SYSTEM = """You are an Employee Engagement Agent.
Identify optimal study windows and keep learners on track.
Return JSON with keys: best_study_times (list of strings),
reminder_schedule (list of {day, time, message}),
risk_indicators (list of strings),
engagement_recommendations (list of strings),
disengagement_risk_level (string: low/medium/high)."""


def agent_engagement(learner: LearnerInput, study_plan: dict) -> tuple[dict, int]:
    prompt = f"""Meeting Hours/Week: {learner.meeting_hours}
Focus Hours/Week: {learner.focus_hours}
Preferred Slot: {learner.preferred_slot}
Weekly Study Hours Available: {learner.weekly_hours}
Practice Score: {learner.practice_score}
Study Milestones: {json.dumps(study_plan.get('milestones', [])[:3])}

Identify optimal study windows and engagement strategy."""
    return call_groq(ENGAGEMENT_SYSTEM, prompt, 800)


# ─── Agent 4: Assessment Agent ────────────────────────────────────────────────

ASSESSMENT_SYSTEM = """You are a Certification Assessment Agent.
Generate practice questions and evaluate readiness.
Return JSON with keys: questions (list of {id, question, options (list of 4), correct_index (0-3), difficulty, topic}),
weak_areas (list of strings), readiness_score (int 0-100),
recommended_next_topics (list of strings), assessment_summary (string)."""


def agent_assessment(learner: LearnerInput, learning_path: dict) -> tuple[dict, int]:
    prompt = f"""Certification: {learner.certification}
Role: {learner.role}
Skill Level: {learner.skill_level}
Current Practice Score: {learner.practice_score}
Key Topics: {json.dumps(learning_path.get('key_topics', [])[:6])}

Generate 5 practice questions (mix of easy/medium/hard) and identify weak areas."""
    return call_groq(ASSESSMENT_SYSTEM, prompt, 1500)


# ─── Agent 5: AI Mentor Agent ─────────────────────────────────────────────────

MENTOR_SYSTEM = """You are a Senior AI Learning Mentor and personal certification coach.
Explain difficult concepts clearly and provide actionable guidance.
Return JSON with keys: explanation (string), real_world_example (string),
common_mistakes (list of strings), quick_revision_notes (list of strings),
practice_exercise (string), difficulty_adapted_tips (list of strings)."""


def agent_mentor(learner: LearnerInput, weak_areas: list) -> tuple[dict, int]:
    topic = weak_areas[0] if weak_areas else learner.certification
    prompt = f"""Learner Role: {learner.role}
Skill Level: {learner.skill_level}
Certification: {learner.certification}
Top Weak Area: {topic}
Other Weak Areas: {', '.join(weak_areas[1:3]) if len(weak_areas) > 1 else 'None'}

Provide targeted mentoring for the top weak area."""
    return call_groq(MENTOR_SYSTEM, prompt, 1000)


# ─── Agent 6: Success Predictor ───────────────────────────────────────────────

PREDICTOR_SYSTEM = """You are a Certification Success Prediction Agent.
Predict exam pass probability and identify preparation gaps.
Return JSON with keys: pass_probability (int 0-100), risk_level (string: high/moderate/low),
confidence_score (int 0-100), main_weaknesses (list of strings),
improvement_actions (list of {action, impact, time_required}),
predicted_outcome (string), readiness_tier (string: High Risk/Moderate Risk/Exam Ready)."""


def agent_predictor(learner: LearnerInput, assessment: dict, study_plan: dict) -> tuple[dict, int]:
    exam = date.fromisoformat(learner.exam_date)
    days_left = max(0, (exam - date.today()).days)
    prompt = f"""Hours Studied: {learner.weekly_hours * max(1, days_left // 7)}
Practice Score: {learner.practice_score}
Assessment Score: {assessment.get('readiness_score', learner.practice_score)}
Meeting Load: {learner.meeting_hours}h/week
Weak Areas: {json.dumps(assessment.get('weak_areas', []))}
Days Until Exam: {days_left}
Total Weeks of Plan: {study_plan.get('total_weeks', 8)}

Predict success probability and provide improvement actions."""
    return call_groq(PREDICTOR_SYSTEM, prompt, 1000)


# ─── Agent 7: Manager Insights ────────────────────────────────────────────────

MANAGER_SYSTEM = """You are a Manager Insights Agent providing team-level visibility.
Return JSON with keys: team_readiness_score (int 0-100),
certification_progress_summary (string), skill_gap_analysis (list of {skill, gap_level}),
risk_analysis (string), recommended_manager_actions (list of strings),
workforce_insights (list of strings), at_risk_flag (boolean)."""


def agent_manager(learner: LearnerInput, predictor: dict, assessment: dict) -> tuple[dict, int]:
    prompt = f"""Employee Role: {learner.role}
Certification: {learner.certification}
Pass Probability: {predictor.get('pass_probability', 50)}%
Risk Level: {predictor.get('risk_level', 'moderate')}
Main Weaknesses: {json.dumps(predictor.get('main_weaknesses', []))}
Meeting Hours: {learner.meeting_hours}h/week
Weak Skill Areas: {json.dumps(assessment.get('weak_areas', []))}

Generate manager-level insights and recommended actions."""
    return call_groq(MANAGER_SYSTEM, prompt, 900)


# ─── Agent 8: Executive Briefing Agent ────────────────────────────────────────

EXECUTIVE_BRIEFING_SYSTEM = """You are Executive Briefing Agent. Your role is to provide management-level summaries.
Analyze:
Team Readiness
Pass Probability
Certification Coverage
Skill Gaps
At-Risk Learners

Generate:
EXECUTIVE SUMMARY
Overall Team Readiness
Top Certifications
Highest Risk Areas
Most Common Skill Gaps
Predicted Pass Rate
Recommended Actions
Priority Recommendations

Return JSON with keys:
team_readiness_pct (int),
predicted_pass_rate (int),
critical_risk (string),
recommended_action (string),
manager_priority (string),
top_certifications (list of strings),
highest_risk_areas (list of strings),
most_common_skill_gaps (list of strings),
priority_recommendations (list of strings),
executive_summary_text (string).

Always respond with valid JSON only. Do not add markdown backticks outside of the JSON object.
"""

def agent_executive_briefing(learner: LearnerInput, predictor: dict, manager: dict) -> tuple[dict, int]:
    prompt = f"""Role: {learner.role}
Certification: {learner.certification}
Pass Probability: {predictor.get('pass_probability', 50)}%
Team Readiness: {manager.get('team_readiness_score', 50)}%
Skill Gaps: {json.dumps(manager.get('skill_gap_analysis', []))}
At-Risk: {manager.get('at_risk_flag', False)}

Generate management-level executive summary and recommendations."""
    return call_groq(EXECUTIVE_BRIEFING_SYSTEM, prompt, 1000)


# ─── Foundry IQ Knowledge Agent ──────────────────────────────────────────────

FOUNDRY_IQ_SYSTEM = """You are Foundry IQ Knowledge Agent. Before answering:
1. Search retrieved certification documents.
2. Search uploaded learning guides.
3. Search approved certification references.
4. Search synthetic enterprise training documents.

Never answer from model memory alone. Every recommendation must include:
Source Document Name
Confidence Score

Return JSON with keys:
recommendations (list of {recommendation, source, confidence_score})

Always show citations.

Output Example:
{
  "recommendations": [
    {
      "recommendation": "Study Azure Functions before Storage Accounts.",
      "source": "AZ-204 Learning Guide",
      "confidence_score": 92
    },
    {
      "recommendation": "Practice REST API implementation.",
      "source": "AZ-204 Module 5",
      "confidence_score": 88
    }
  ]
}"""

def agent_foundry_iq(learner: LearnerInput) -> tuple[dict, int]:
    prompt = f"""Generate certification recommendations and citations for:
Role: {learner.role}
Certification: {learner.certification}
Skill Level: {learner.skill_level}
Practice Score: {learner.practice_score}/100"""
    return call_groq(FOUNDRY_IQ_SYSTEM, prompt, 1000)


# ─── Master Orchestrator ──────────────────────────────────────────────────────

@app.post("/api/orchestrate", response_model=OrchestrationResult, tags=["Orchestration"])
async def orchestrate(learner: LearnerInput):
    """
    Master Orchestrator: runs all 8 agents sequentially and returns unified output.
    """
    total_tokens = 0

    # Agent 1
    learning_path, t1 = agent_learning_path(learner)
    total_tokens += t1

    # Agent 2
    study_plan, t2 = agent_study_plan(learner, learning_path)
    total_tokens += t2

    # Agent 3
    engagement, t3 = agent_engagement(learner, study_plan)
    total_tokens += t3

    # Agent 4
    assessment, t4 = agent_assessment(learner, learning_path)
    total_tokens += t4

    # Agent 5
    mentor, t5 = agent_mentor(learner, assessment.get("weak_areas", []))
    total_tokens += t5

    # Agent 6
    prediction, t6 = agent_predictor(learner, assessment, study_plan)
    total_tokens += t6

    # Agent 7
    manager, t7 = agent_manager(learner, prediction, assessment)
    total_tokens += t7

    # Agent 8: Executive Briefing
    executive_briefing, t8 = agent_executive_briefing(learner, prediction, manager)
    total_tokens += t8

    # Foundry IQ Grounding Agent
    foundry_iq, t9 = agent_foundry_iq(learner)
    total_tokens += t9

    # Build recommended actions summary
    actions = (
        prediction.get("improvement_actions", [{}])[:3] +
        manager.get("recommended_manager_actions", [])[:2]
    )
    action_strings = [
        a.get("action", a) if isinstance(a, dict) else str(a)
        for a in actions
    ]

    return OrchestrationResult(
        learner_profile={
            "role": learner.role,
            "certification": learner.certification,
            "skill_level": learner.skill_level,
            "exam_date": learner.exam_date,
            "weekly_hours": learner.weekly_hours,
            "practice_score": learner.practice_score,
        },
        certification_roadmap=learning_path,
        study_schedule=study_plan,
        engagement_strategy=engagement,
        assessment_results=assessment,
        success_prediction=prediction,
        manager_insights=manager,
        executive_briefing=executive_briefing,
        foundry_iq=foundry_iq,
        mentor_insights=mentor,
        recommended_actions=action_strings,
        total_tokens=total_tokens,
    )


# ─── Individual Agent Endpoints ───────────────────────────────────────────────

@app.post("/api/agents/learning-path", tags=["Agents"])
async def run_learning_path(learner: LearnerInput):
    output, tokens = agent_learning_path(learner)
    return {"agent": "Learning Path Curator", "output": output, "tokens_used": tokens}


@app.post("/api/agents/study-plan", tags=["Agents"])
async def run_study_plan(learner: LearnerInput):
    lp, _ = agent_learning_path(learner)
    output, tokens = agent_study_plan(learner, lp)
    return {"agent": "Study Plan Generator", "output": output, "tokens_used": tokens}


@app.post("/api/agents/assessment", tags=["Agents"])
async def run_assessment(learner: LearnerInput):
    lp, _ = agent_learning_path(learner)
    output, tokens = agent_assessment(learner, lp)
    return {"agent": "Assessment Agent", "output": output, "tokens_used": tokens}


@app.post("/api/agents/predict", tags=["Agents"])
async def run_predictor(learner: LearnerInput):
    lp, _ = agent_learning_path(learner)
    assessment, _ = agent_assessment(learner, lp)
    sp, _ = agent_study_plan(learner, lp)
    output, tokens = agent_predictor(learner, assessment, sp)
    return {"agent": "Success Predictor", "output": output, "tokens_used": tokens}


# ─── Mock Data for Demo Mode ──────────────────────────────────────────────────

ROLES = ["Cloud Engineer", "Solution Architect", "DevOps Lead", "Security Analyst",
         "Platform Engineer", "Data Engineer", "ML Engineer", "Network Engineer"]
CERTS = ["AZ-204", "AZ-900", "AZ-305", "AWS-SAA", "AWS-DVA", "GCP-ACE", "SC-900", "DP-900"]
CERT_NAMES = {
    "AZ-204": "Azure Developer Associate", "AZ-900": "Azure Fundamentals",
    "AZ-305": "Azure Solutions Architect Expert", "AWS-SAA": "AWS Solutions Architect Associate",
    "AWS-DVA": "AWS Developer Associate", "GCP-ACE": "GCP Associate Cloud Engineer",
    "SC-900": "Microsoft Security Fundamentals", "DP-900": "Azure Data Fundamentals",
}
RISK_LEVELS = ["exam_ready", "moderate_risk", "high_risk"]
MANAGERS = [
    {"id": "M-001", "name": "Sarah Chen"}, {"id": "M-002", "name": "Raj Sharma"},
    {"id": "M-003", "name": "Lisa Park"}, {"id": "M-004", "name": "David Obi"},
]
FIRST_NAMES = ["Alex", "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Avery", "Quinn",
               "Blake", "Cameron", "Drew", "Skylar", "Parker", "Reese", "Logan", "Peyton",
               "Finley", "Rowan", "Emerson", "Hadley", "Sawyer", "Harper", "Elliot", "Indie"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Martinez",
              "Davis", "Wilson", "Anderson", "Thomas", "Jackson", "White", "Harris",
              "Martin", "Thompson", "Moore", "Young", "Allen", "King", "Wright", "Scott"]
SKILL_AREAS = ["Azure Architecture", "Security & Compliance", "DevOps & CI/CD",
               "Networking", "IAM & Access", "Storage & Databases", "AI / ML Services",
               "Kubernetes & Containers"]

random.seed(42)

def _fake_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def _make_mock_learners(n=87):
    learners = []
    for i in range(n):
        score = random.randint(20, 99)
        risk = "exam_ready" if score >= 71 else ("moderate_risk" if score >= 41 else "high_risk")
        cert_id = random.choice(CERTS)
        mgr = random.choice(MANAGERS)
        exam_offset = random.randint(5, 90)
        learners.append({
            "learner_id": f"L-{1000+i}",
            "name": _fake_name(),
            "email": f"user{1000+i}@company.com",
            "role": random.choice(ROLES),
            "department": f"Dept {random.randint(1,4)}",
            "manager_id": mgr["id"],
            "manager_name": mgr["name"],
            "certification_id": cert_id,
            "certification_name": CERT_NAMES[cert_id],
            "exam_date": (date.today() + timedelta(days=exam_offset)).isoformat(),
            "practice_score": score,
            "pass_probability": round(score * 0.85 + random.uniform(-5, 5), 1),
            "risk_level": risk,
            "hours_studied": random.randint(10, 100),
            "completion_pct": round(random.uniform(15, 100), 1),
            "engagement_score": random.randint(30, 100),
            "streak_days": random.randint(0, 30),
        })
    return learners

_MOCK_LEARNERS = _make_mock_learners(87)


# ─── Dashboard / Analytics Endpoints (DB or Mock) ────────────────────────────

@app.get("/api/dashboard/overview", tags=["Dashboard"])
async def dashboard_overview(conn=Depends(get_db)):
    if conn is None:
        # Demo mode — return mock stats
        total = len(_MOCK_LEARNERS)
        ready = sum(1 for l in _MOCK_LEARNERS if l["risk_level"] == "exam_ready")
        moderate = sum(1 for l in _MOCK_LEARNERS if l["risk_level"] == "moderate_risk")
        high = sum(1 for l in _MOCK_LEARNERS if l["risk_level"] == "high_risk")
        avg_score = round(sum(l["practice_score"] for l in _MOCK_LEARNERS) / total)
        avg_pass = round(sum(l["pass_probability"] for l in _MOCK_LEARNERS) / total)
        upcoming = sum(1 for l in _MOCK_LEARNERS
                       if 0 <= (date.fromisoformat(l["exam_date"]) - date.today()).days <= 30)
        return {
            "total_learners": total, "exam_ready": ready, "moderate_risk": moderate,
            "high_risk": high, "team_readiness_pct": round(ready / total * 100),
            "avg_practice_score": avg_score, "avg_pass_probability": avg_pass,
            "upcoming_exams_30d": upcoming, "demo_mode": True,
        }
    total = await conn.fetchval("SELECT COUNT(*) FROM learners")
    ready = await conn.fetchval("SELECT COUNT(*) FROM learners WHERE risk_level='exam_ready'")
    moderate = await conn.fetchval("SELECT COUNT(*) FROM learners WHERE risk_level='moderate_risk'")
    high = await conn.fetchval("SELECT COUNT(*) FROM learners WHERE risk_level='high_risk'")
    avg_score = await conn.fetchval("SELECT ROUND(AVG(practice_score)) FROM learners")
    avg_pass = await conn.fetchval("SELECT ROUND(AVG(pass_probability)) FROM learners")
    upcoming_exams = await conn.fetchval(
        "SELECT COUNT(*) FROM learners WHERE exam_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'"
    )
    return {
        "total_learners": total, "exam_ready": ready, "moderate_risk": moderate,
        "high_risk": high, "team_readiness_pct": round(ready / total * 100) if total else 0,
        "avg_practice_score": avg_score, "avg_pass_probability": avg_pass,
        "upcoming_exams_30d": upcoming_exams,
    }


@app.get("/api/dashboard/learners", tags=["Dashboard"])
async def list_learners(
    risk_level: Optional[str] = Query(None),
    certification_id: Optional[str] = Query(None),
    manager_id: Optional[str] = Query(None),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0),
    conn=Depends(get_db),
):
    if conn is None:
        filtered = _MOCK_LEARNERS
        if risk_level:
            filtered = [l for l in filtered if l["risk_level"] == risk_level]
        if certification_id:
            filtered = [l for l in filtered if l["certification_id"] == certification_id]
        if manager_id:
            filtered = [l for l in filtered if l["manager_id"] == manager_id]
        return {"total": len(filtered), "learners": filtered[offset:offset+limit], "demo_mode": True}

    where, params = [], []
    if risk_level:
        params.append(risk_level); where.append(f"risk_level = ${len(params)}")
    if certification_id:
        params.append(certification_id); where.append(f"certification_id = ${len(params)}")
    if manager_id:
        params.append(manager_id); where.append(f"manager_id = ${len(params)}")

    clause = "WHERE " + " AND ".join(where) if where else ""
    params += [limit, offset]

    rows = await conn.fetch(
        f"""SELECT learner_id, name, role, certification_id, practice_score,
               pass_probability, risk_level, exam_date, hours_studied,
               completion_pct, engagement_score, streak_days
            FROM learners {clause}
            ORDER BY exam_date ASC
            LIMIT ${len(params)-1} OFFSET ${len(params)}""",
        *params,
    )
    total = await conn.fetchval(f"SELECT COUNT(*) FROM learners {clause}", *params[:-2])
    return {"total": total, "learners": [dict(r) for r in rows]}


@app.get("/api/dashboard/learners/{learner_id}", tags=["Dashboard"])
async def get_learner(learner_id: str, conn=Depends(get_db)):
    if conn is None:
        learner = next((l for l in _MOCK_LEARNERS if l["learner_id"] == learner_id), None)
        if not learner:
            raise HTTPException(404, "Learner not found")
        result = dict(learner)
        result["skill_gaps"] = {s: random.randint(10, 90) for s in SKILL_AREAS}
        result["demo_mode"] = True
        return result
    row = await conn.fetchrow("SELECT * FROM learners WHERE learner_id=$1", learner_id)
    if not row:
        raise HTTPException(404, "Learner not found")
    gaps = await conn.fetch("SELECT skill_area, gap_score FROM skill_gaps WHERE learner_id=$1", learner_id)
    result = dict(row)
    result["skill_gaps"] = {g["skill_area"]: g["gap_score"] for g in gaps}
    return result


@app.get("/api/dashboard/skill-gaps", tags=["Dashboard"])
async def skill_gap_heatmap(conn=Depends(get_db)):
    if conn is None:
        return [
            {"skill_area": s, "avg_gap": random.randint(20, 80), "learner_count": random.randint(40, 87)}
            for s in SKILL_AREAS
        ]
    rows = await conn.fetch(
        """SELECT skill_area, ROUND(AVG(gap_score)) as avg_gap, COUNT(*) as learner_count
           FROM skill_gaps
           GROUP BY skill_area
           ORDER BY avg_gap DESC"""
    )
    return [dict(r) for r in rows]


@app.get("/api/dashboard/certifications", tags=["Dashboard"])
async def certification_breakdown(conn=Depends(get_db)):
    if conn is None:
        result = []
        for cert_id, cert_name in CERT_NAMES.items():
            learners = [l for l in _MOCK_LEARNERS if l["certification_id"] == cert_id]
            if learners:
                result.append({
                    "certification_id": cert_id,
                    "name": cert_name,
                    "learner_count": len(learners),
                    "avg_score": round(sum(l["practice_score"] for l in learners) / len(learners)),
                    "avg_pass_prob": round(sum(l["pass_probability"] for l in learners) / len(learners)),
                    "ready_count": sum(1 for l in learners if l["risk_level"] == "exam_ready"),
                })
        return sorted(result, key=lambda x: x["learner_count"], reverse=True)
    rows = await conn.fetch(
        """SELECT l.certification_id, c.name,
               COUNT(*) as learner_count,
               ROUND(AVG(l.practice_score)) as avg_score,
               ROUND(AVG(l.pass_probability)) as avg_pass_prob,
               SUM(CASE WHEN l.risk_level='exam_ready' THEN 1 ELSE 0 END) as ready_count
           FROM learners l
           JOIN certifications c ON l.certification_id = c.id
           GROUP BY l.certification_id, c.name
           ORDER BY learner_count DESC"""
    )
    return [dict(r) for r in rows]


@app.get("/api/dashboard/upcoming-exams", tags=["Dashboard"])
async def upcoming_exams(days: int = Query(default=30), conn=Depends(get_db)):
    if conn is None:
        cutoff = date.today() + timedelta(days=days)
        return [
            l for l in _MOCK_LEARNERS
            if date.today() <= date.fromisoformat(l["exam_date"]) <= cutoff
        ]
    rows = await conn.fetch(
        """SELECT learner_id, name, role, certification_id, exam_date,
               practice_score, risk_level, pass_probability
           FROM learners
           WHERE exam_date BETWEEN NOW() AND NOW() + ($1 || ' days')::INTERVAL
           ORDER BY exam_date ASC""",
        str(days),
    )
    return [dict(r) for r in rows]


@app.get("/api/dashboard/manager/{manager_id}", tags=["Dashboard"])
async def manager_dashboard(manager_id: str, conn=Depends(get_db)):
    if conn is None:
        team = [l for l in _MOCK_LEARNERS if l["manager_id"] == manager_id]
        if not team:
            raise HTTPException(404, "Manager not found or has no learners")
        ready = sum(1 for l in team if l["risk_level"] == "exam_ready")
        return {
            "manager_id": manager_id,
            "team_size": len(team),
            "team_readiness_pct": round(ready / len(team) * 100),
            "avg_score": round(sum(l["practice_score"] for l in team) / len(team)),
            "at_risk_count": sum(1 for l in team if l["risk_level"] == "high_risk"),
            "learners": team,
            "demo_mode": True,
        }
    rows = await conn.fetch(
        """SELECT learner_id, name, role, certification_id, practice_score,
               risk_level, pass_probability, exam_date, engagement_score
           FROM learners WHERE manager_id=$1 ORDER BY risk_level, exam_date""",
        manager_id,
    )
    if not rows:
        raise HTTPException(404, "Manager not found or has no learners")
    team = [dict(r) for r in rows]
    ready = sum(1 for l in team if l["risk_level"] == "exam_ready")
    return {
        "manager_id": manager_id,
        "team_size": len(team),
        "team_readiness_pct": round(ready / len(team) * 100) if team else 0,
        "avg_score": round(sum(l["practice_score"] for l in team) / len(team)),
        "at_risk_count": sum(1 for l in team if l["risk_level"] == "high_risk"),
        "learners": team,
    }


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "agents": 8,
        "version": "1.0.0",
        "db_connected": DB_AVAILABLE,
        "mode": "live" if DB_AVAILABLE else "demo",
    }
