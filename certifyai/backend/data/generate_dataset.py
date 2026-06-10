"""
CertifyAI 360 — Synthetic Dataset Generator
Generates 87 realistic learner records and seeds PostgreSQL.
Run: python generate_dataset.py
"""

import json
import random
import uuid
from datetime import date, timedelta
from faker import Faker

fake = Faker()
random.seed(42)

ROLES = [
    "Cloud Engineer",
    "Solution Architect",
    "DevOps Lead",
    "Security Analyst",
    "Platform Engineer",
    "Data Engineer",
    "ML Engineer",
    "Network Engineer",
]

CERTIFICATIONS = [
    {"id": "AZ-204", "name": "Azure Developer Associate", "total_hours": 80},
    {"id": "AZ-900", "name": "Azure Fundamentals", "total_hours": 40},
    {"id": "AZ-305", "name": "Azure Solutions Architect Expert", "total_hours": 120},
    {"id": "AWS-SAA", "name": "AWS Solutions Architect Associate", "total_hours": 90},
    {"id": "AWS-DVA", "name": "AWS Developer Associate", "total_hours": 75},
    {"id": "GCP-ACE", "name": "GCP Associate Cloud Engineer", "total_hours": 70},
    {"id": "SC-900", "name": "Microsoft Security Fundamentals", "total_hours": 35},
    {"id": "DP-900", "name": "Azure Data Fundamentals", "total_hours": 30},
]

ROLE_CERT_AFFINITY = {
    "Cloud Engineer":       ["AZ-204", "AZ-900", "AZ-305"],
    "Solution Architect":   ["AZ-305", "AWS-SAA", "GCP-ACE"],
    "DevOps Lead":          ["AZ-204", "AWS-DVA", "GCP-ACE"],
    "Security Analyst":     ["SC-900", "AZ-900"],
    "Platform Engineer":    ["AZ-305", "AWS-SAA", "GCP-ACE"],
    "Data Engineer":        ["DP-900", "AZ-204", "AWS-SAA"],
    "ML Engineer":          ["DP-900", "GCP-ACE", "AWS-DVA"],
    "Network Engineer":     ["AZ-900", "SC-900", "AWS-SAA"],
}

SKILL_AREAS = [
    "Azure Architecture", "Security & Compliance", "DevOps & CI/CD",
    "Networking", "IAM & Access", "Storage & Databases",
    "AI / ML Services", "Kubernetes & Containers",
]

MANAGERS = [
    {"id": "M-001", "name": "Sarah Chen", "department": "Cloud Infrastructure"},
    {"id": "M-002", "name": "Raj Sharma", "department": "Platform Engineering"},
    {"id": "M-003", "name": "Lisa Park",  "department": "Security & Compliance"},
    {"id": "M-004", "name": "David Obi",  "department": "Data & AI"},
]


def score_from_hours(hours: int, noise: float = 0.25) -> int:
    """Simulate a realistic practice score from hours studied."""
    base = min(100, max(20, hours * 1.5 + 25))
    jitter = random.gauss(0, noise * 30)
    return int(min(100, max(5, base + jitter)))


def risk_level(score: int) -> str:
    if score >= 71:
        return "exam_ready"
    if score >= 41:
        return "moderate_risk"
    return "high_risk"


def pass_probability(score: int, hours: int) -> float:
    raw = (score * 0.7 + min(hours / 80 * 100, 100) * 0.3)
    return round(min(99, max(5, raw + random.gauss(0, 3))), 1)


def generate_skill_gaps() -> dict:
    return {skill: random.randint(10, 90) for skill in SKILL_AREAS}


def generate_learner(index: int) -> dict:
    role = random.choice(ROLES)
    cert_id = random.choice(ROLE_CERT_AFFINITY[role])
    cert = next(c for c in CERTIFICATIONS if c["id"] == cert_id)

    weeks_until_exam = random.randint(2, 12)
    exam_date = date.today() + timedelta(weeks=weeks_until_exam)

    weekly_hours = random.choice([3, 5, 5, 7, 7, 10, 10, 12, 15])
    low = max(5, weekly_hours * (8 - weeks_until_exam))
    high = min(cert["total_hours"], weekly_hours * 8)
    hours_studied = random.randint(min(low, high), max(low, high))

    practice_score = score_from_hours(hours_studied)
    assessment_score = score_from_hours(hours_studied, noise=0.2)

    meeting_hours = random.randint(8, 28)
    focus_hours = max(4, 40 - meeting_hours - random.randint(0, 8))

    manager = random.choice(MANAGERS)

    return {
        "learner_id": f"L-{1000 + index}",
        "name": fake.name(),
        "email": fake.email(),
        "role": role,
        "department": manager["department"],
        "manager_id": manager["id"],
        "manager_name": manager["name"],

        "certification_id": cert_id,
        "certification_name": cert["name"],
        "exam_date": exam_date.isoformat(),
        "weeks_until_exam": weeks_until_exam,

        "hours_studied": hours_studied,
        "total_required_hours": cert["total_hours"],
        "weekly_available_hours": weekly_hours,
        "completion_pct": round(hours_studied / cert["total_hours"] * 100, 1),

        "practice_score": practice_score,
        "assessment_score": assessment_score,
        "pass_probability": pass_probability(practice_score, hours_studied),
        "risk_level": risk_level(practice_score),
        "confidence_score": practice_score,

        "meeting_hours_weekly": meeting_hours,
        "focus_hours_weekly": focus_hours,
        "preferred_learning_slot": random.choice(["Morning", "Afternoon", "Evening"]),

        "skill_gaps": generate_skill_gaps(),

        "current_skill_level": random.choice(["Beginner", "Intermediate", "Advanced"]),
        "enrolled_date": (date.today() - timedelta(weeks=random.randint(2, 16))).isoformat(),
        "last_activity": (date.today() - timedelta(days=random.randint(0, 7))).isoformat(),

        "engagement_score": random.randint(30, 100),
        "streak_days": random.randint(0, 30),
        "modules_completed": random.randint(1, 12),
        "total_modules": random.randint(8, 16),
    }


def generate_dataset(n: int = 87) -> list[dict]:
    return [generate_learner(i) for i in range(n)]


def save_json(data: list[dict], path: str = "learners.json"):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved {len(data)} learners to {path}")


SQL_SCHEMA = """
-- CertifyAI 360 PostgreSQL Schema

CREATE TABLE IF NOT EXISTS certifications (
    id          VARCHAR(20) PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    total_hours INT NOT NULL
);

CREATE TABLE IF NOT EXISTS managers (
    id          VARCHAR(20) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    department  VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS learners (
    learner_id              VARCHAR(20) PRIMARY KEY,
    name                    VARCHAR(100) NOT NULL,
    email                   VARCHAR(150) UNIQUE NOT NULL,
    role                    VARCHAR(80) NOT NULL,
    department              VARCHAR(100),
    manager_id              VARCHAR(20) REFERENCES managers(id),

    certification_id        VARCHAR(20) REFERENCES certifications(id),
    exam_date               DATE,
    weeks_until_exam        INT,

    hours_studied           INT DEFAULT 0,
    total_required_hours    INT,
    weekly_available_hours  INT,
    completion_pct          FLOAT,

    practice_score          INT,
    assessment_score        INT,
    pass_probability        FLOAT,
    risk_level              VARCHAR(20),
    confidence_score        INT,

    meeting_hours_weekly    INT,
    focus_hours_weekly      INT,
    preferred_learning_slot VARCHAR(20),

    current_skill_level     VARCHAR(20),
    enrolled_date           DATE,
    last_activity           DATE,

    engagement_score        INT,
    streak_days             INT,
    modules_completed       INT,
    total_modules           INT,

    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_gaps (
    id          SERIAL PRIMARY KEY,
    learner_id  VARCHAR(20) REFERENCES learners(learner_id) ON DELETE CASCADE,
    skill_area  VARCHAR(80) NOT NULL,
    gap_score   INT NOT NULL,
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learners_risk ON learners(risk_level);
CREATE INDEX IF NOT EXISTS idx_learners_cert ON learners(certification_id);
CREATE INDEX IF NOT EXISTS idx_learners_manager ON learners(manager_id);
CREATE INDEX IF NOT EXISTS idx_learners_exam ON learners(exam_date);
"""


def save_schema(path: str = "schema.sql"):
    with open(path, "w") as f:
        f.write(SQL_SCHEMA)
    print(f"Saved SQL schema to {path}")


def generate_seed_sql(data: list[dict], path: str = "seed.sql") -> None:
    lines = ["BEGIN;\n"]

    for c in CERTIFICATIONS:
        lines.append(
            f"INSERT INTO certifications VALUES ('{c['id']}', '{c['name']}', {c['total_hours']}) "
            f"ON CONFLICT DO NOTHING;"
        )

    lines.append("")
    for m in MANAGERS:
        lines.append(
            f"INSERT INTO managers VALUES ('{m['id']}', '{m['name']}', '{m['department']}') "
            f"ON CONFLICT DO NOTHING;"
        )

    lines.append("")
    for l in data:
        name  = l['name'].replace("'", "''")
        email = l['email'].replace("'", "''")
        lines.append(
            f"INSERT INTO learners (learner_id,name,email,role,department,manager_id,"
            f"certification_id,exam_date,weeks_until_exam,hours_studied,total_required_hours,"
            f"weekly_available_hours,completion_pct,practice_score,assessment_score,"
            f"pass_probability,risk_level,confidence_score,meeting_hours_weekly,focus_hours_weekly,"
            f"preferred_learning_slot,current_skill_level,enrolled_date,last_activity,"
            f"engagement_score,streak_days,modules_completed,total_modules) VALUES ("
            f"'{l['learner_id']}','{name}','{email}','{l['role']}','{l['department']}',"
            f"'{l['manager_id']}','{l['certification_id']}','{l['exam_date']}',"
            f"{l['weeks_until_exam']},{l['hours_studied']},{l['total_required_hours']},"
            f"{l['weekly_available_hours']},{l['completion_pct']},{l['practice_score']},"
            f"{l['assessment_score']},{l['pass_probability']},'{l['risk_level']}',"
            f"{l['confidence_score']},{l['meeting_hours_weekly']},{l['focus_hours_weekly']},"
            f"'{l['preferred_learning_slot']}','{l['current_skill_level']}','{l['enrolled_date']}',"
            f"'{l['last_activity']}',{l['engagement_score']},{l['streak_days']},"
            f"{l['modules_completed']},{l['total_modules']}) ON CONFLICT DO NOTHING;"
        )
        for skill, gap in l["skill_gaps"].items():
            skill_esc = skill.replace("'", "''")
            lines.append(
                f"INSERT INTO skill_gaps (learner_id, skill_area, gap_score) VALUES "
                f"('{l['learner_id']}', '{skill_esc}', {gap});"
            )

    lines.append("\nCOMMIT;")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    print(f"Saved seed SQL to {path} ({len(data)} learners)")


if __name__ == "__main__":
    print("Generating CertifyAI 360 synthetic dataset...")
    dataset = generate_dataset(87)

    save_json(dataset, "learners.json")
    save_schema("schema.sql")
    generate_seed_sql(dataset, "seed.sql")

    ready   = sum(1 for l in dataset if l["risk_level"] == "exam_ready")
    moderate = sum(1 for l in dataset if l["risk_level"] == "moderate_risk")
    high    = sum(1 for l in dataset if l["risk_level"] == "high_risk")
    avg_score = round(sum(l["practice_score"] for l in dataset) / len(dataset), 1)

    print(f"\nDataset Summary:")
    print(f"  Total learners : {len(dataset)}")
    print(f"  Exam Ready     : {ready}")
    print(f"  Moderate Risk  : {moderate}")
    print(f"  High Risk      : {high}")
    print(f"  Avg Score      : {avg_score}")
    print(f"\nRun against Postgres:")
    print(f"  psql $DATABASE_URL -f data/schema.sql")
    print(f"  psql $DATABASE_URL -f data/seed.sql")
