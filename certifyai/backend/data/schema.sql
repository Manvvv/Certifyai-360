
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
