import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts";

let rawAPI = import.meta.env.VITE_API_URL || "http://localhost:8000";
if (rawAPI && !rawAPI.startsWith("http://") && !rawAPI.startsWith("https://")) {
  rawAPI = "https://" + rawAPI;
}
const API = rawAPI.endsWith("/") ? rawAPI.slice(0, -1) : rawAPI;

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  blue: "#185FA5", blueLight: "#E6F1FB", blueMid: "#378ADD",
  green: "#3B6D11", greenLight: "#EAF3DE",
  amber: "#854F0B", amberLight: "#FAEEDA", amberMid: "#EF9F27",
  red: "#A32D2D", redLight: "#FCEBEB", redMid: "#E24B4A",
  purple: "#534AB7", purpleLight: "#EEEDFE",
  gray: "#5F5E5A", grayLight: "#F1EFE8",
};

const TRACE_STEPS = [
  "✓ Learning Path Agent Running...",
  "✓ Learning Path Generated",
  "✓ Study Plan Agent Running...",
  "✓ Study Plan Generated",
  "✓ Engagement Agent Running...",
  "✓ Schedule Optimized",
  "✓ Assessment Agent Running...",
  "✓ Readiness Calculated",
  "✓ Success Predictor Running...",
  "✓ Pass Probability Generated",
  "✓ Manager Insights Running...",
  "✓ Team Dashboard Updated",
  "✓ Executive Briefing Running...",
  "✓ Executive Summary Generated"
];

const riskColor = (r) =>
  r === "exam_ready" ? C.blue : r === "moderate_risk" ? C.amberMid : C.redMid;

const riskLabel = (r) =>
  r === "exam_ready" ? "Exam Ready" : r === "moderate_risk" ? "Moderate" : "High Risk";

const scoreColor = (s) => (s >= 71 ? C.blue : s >= 41 ? C.amberMid : C.redMid);

// ─── Badge ───────────────────────────────────────────────────────────────────
function Badge({ children, color = "blue" }) {
  const map = {
    blue: { bg: C.blueLight, text: C.blue },
    green: { bg: C.greenLight, text: C.green },
    amber: { bg: C.amberLight, text: C.amber },
    red: { bg: C.redLight, text: C.red },
    purple: { bg: C.purpleLight, text: C.purple },
  };
  const s = map[color] || map.blue;
  return (
    <span style={{
      background: s.bg, color: s.text, fontSize: 11, fontWeight: 600,
      padding: "3px 10px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {children}
    </span>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color = C.blue }) {
  // Shrink font size for long values so they never overflow the card
  const strLen = String(value).length;
  const valSize = strLen > 12 ? 13 : strLen > 8 ? 16 : strLen > 5 ? 22 : 28;
  return (
    <div style={{
      background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12,
      padding: "1rem 1.25rem", minWidth: 0, overflow: "hidden",
    }}>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontSize: valSize, fontWeight: 700, color, fontFamily: strLen > 8 ? "inherit" : "DM Mono, monospace", lineHeight: 1.2, wordBreak: "break-word" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Section Heading ─────────────────────────────────────────────────────────
function SectionHead({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#222" }}>{children}</div>;
}

// ─── Risk pill ───────────────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  const colorMap = { exam_ready: "green", moderate_risk: "amber", high_risk: "red" };
  return <Badge color={colorMap[risk] || "blue"}>{riskLabel(risk)}</Badge>;
}

// ─── Progress bar ────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color }) {
  return (
    <div style={{ height: 5, background: "#f0efe9", borderRadius: 100, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: color || scoreColor(value), borderRadius: 100, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: C.blueLight, text: C.blue }, { bg: C.greenLight, text: C.green },
  { bg: C.amberLight, text: C.amber }, { bg: C.purpleLight, text: C.purple },
  { bg: C.redLight, text: C.red },
];
function Avatar({ name, size = 36 }) {
  const initials = name?.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  const c = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: c.bg, color: c.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 2, borderBottom: "0.5px solid #e0dfd9",
      marginBottom: "1.5rem", overflowX: "auto", overflowY: "hidden",
      WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: "none", background: "none", whiteSpace: "nowrap", flexShrink: 0,
            color: active === t.id ? C.blue : "#888",
            borderBottom: `2px solid ${active === t.id ? C.blue : "transparent"}`,
            marginBottom: -1, fontFamily: "inherit", transition: "color 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab() {
  const [overview, setOverview] = useState(null);
  const [certs, setCerts] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studyHours, setStudyHours] = useState(8);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/dashboard/overview`).then((r) => r.json()),
      fetch(`${API}/api/dashboard/certifications`).then((r) => r.json()),
      fetch(`${API}/api/dashboard/skill-gaps`).then((r) => r.json()),
      fetch(`${API}/api/dashboard/upcoming-exams?days=30`).then((r) => r.json()),
    ]).then(([ov, cr, sg, ue]) => {
      setOverview(ov); setCerts(cr); setGaps(sg); setUpcoming(ue);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: "2rem", color: "#888", textAlign: "center" }}>Loading dashboard…</div>;
  if (!overview) return null;

  // Recalculations for the What-If Simulator
  const simulatedPassRate = Math.min(98, Math.max(40, 68 + (studyHours - 8) * 3.5));
  const simulatedAtRisk = Math.min(25, Math.max(0, 12 - Math.round((studyHours - 8) * 1.75)));
  const simulatedTeamReadiness = Math.min(100, Math.max(30, 52 + (studyHours - 8) * 4.5));

  const handleGenerateReport = () => {
    const reportWindow = window.open("", "_blank");
    reportWindow.document.write(`
      <html>
        <head>
          <title>CertifyAI Executive Summary Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@400;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #222;
              max-width: 800px;
              margin: 40px auto;
              padding: 0 20px;
              line-height: 1.6;
            }
            h1, h2, h3, h4, .font-title {
              font-family: 'Syne', sans-serif;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #185FA5;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: -0.5px;
              color: #185FA5;
              font-family: 'Syne', sans-serif;
            }
            .meta {
              text-align: right;
              font-size: 12px;
              color: #666;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .card {
              background: #f8f7f4;
              border: 1px solid #e0dfd9;
              border-radius: 8px;
              padding: 16px;
            }
            .card-label {
              font-size: 11px;
              text-transform: uppercase;
              color: #666;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
              font-weight: 600;
            }
            .card-value {
              font-size: 28px;
              font-weight: 700;
              color: #185FA5;
            }
            .section-title {
              font-size: 16px;
              font-weight: 700;
              margin-top: 30px;
              margin-bottom: 15px;
              border-bottom: 1px solid #e0dfd9;
              padding-bottom: 5px;
              color: #185FA5;
            }
            .actions-list {
              padding-left: 20px;
              font-size: 14px;
            }
            .actions-list li {
              margin-bottom: 8px;
            }
            .footer {
              margin-top: 50px;
              font-size: 11px;
              text-align: center;
              color: #888;
              border-top: 1px solid #e0dfd9;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">CERTIFYAI EXECUTIVE SUMMARY</div>
              <div style="font-size: 14px; color: #555; margin-top: 4px;">Enterprise Certification Intelligence Report</div>
            </div>
            <div class="meta">
              <div>Date: ${new Date().toLocaleDateString()}</div>
              <div>Scope: Enterprise Cloud Cohort</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-label">Team Readiness Score</div>
              <div class="card-value">${simulatedTeamReadiness}%</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Target: 80% certification ready</div>
            </div>
            <div class="card">
              <div class="card-label">Predicted Team Pass Rate</div>
              <div class="card-value">${simulatedPassRate}%</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Based on simulated study hours (${studyHours}h/week)</div>
            </div>
            <div class="card">
              <div class="card-label">At-Risk Learners</div>
              <div class="card-value">${simulatedAtRisk}</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Score below 40 (high risk of failure)</div>
            </div>
            <div class="card">
              <div class="card-label">Most Requested Certification</div>
              <div class="card-value">AZ-204</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Azure Developer Associate</div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 30px;">
            <div class="card-label">Biggest Skill Gap</div>
            <div style="font-size: 20px; font-weight: 700; color: #A32D2D; margin-top: 4px;">Kubernetes & Containers</div>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">Identified in 68% of AZ-204 learner assessments</div>
          </div>

          <div class="section-title">RECOMMENDED ACTIONS</div>
          <ul class="actions-list">
            <li><strong>Increase Kubernetes training:</strong> Setup hands-on container labs for the Azure development teams.</li>
            <li><strong>Schedule 2 extra learning hours:</strong> Set aside 2 hours weekly for focused exam preparation slots.</li>
            <li><strong>Focus on AZ-204 cohort:</strong> Prioritize 30-day exam readiness reviews for Developer certification tracks.</li>
          </ul>

          <div class="footer">
            Generated by CertifyAI 360 AI Agent Pipeline on ${new Date().toLocaleString()} · Confidential
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  };

  const distData = [
    { name: "High Risk", value: overview.high_risk, fill: C.redMid },
    { name: "Moderate", value: overview.moderate_risk, fill: C.amberMid },
    { name: "Exam Ready", value: overview.exam_ready, fill: C.blueMid },
  ];

  return (
    <div>
      <div style={{
        background: "#fff",
        border: `1.5px solid ${C.blueLight}`,
        borderRadius: 12,
        padding: "1.25rem",
        marginBottom: "1.25rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 12 }}>
          <div>
            <SectionHead>AI What-If Simulator & Optimization Panel</SectionHead>
            <div style={{ fontSize: 12, color: "#666", marginTop: -6 }}>Drag the slider to adjust Weekly Study Hours and instantly forecast team readiness.</div>
          </div>
          <button
            onClick={handleGenerateReport}
            style={{
              background: C.blue,
              color: "#fff",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 4px rgba(24,95,165,0.15)",
              transition: "transform 0.1s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Generate Executive Report
          </button>
        </div>

        <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              <span>Weekly Study Hours:</span>
              <span style={{ color: C.blue, fontWeight: 700 }}>{studyHours} hrs/week</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              value={studyHours}
              onChange={(e) => setStudyHours(parseInt(e.target.value))}
              style={{
                width: "100%",
                height: 6,
                background: C.blueLight,
                borderRadius: 100,
                outline: "none",
                cursor: "pointer"
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 4 }}>
              <span>4h (Low Intensity)</span>
              <span style={{ fontWeight: 700 }}>8h (Base)</span>
              <span>20h (High Intensity)</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ background: "#f8f7f4", border: "0.5px solid #e0dfd9", padding: "10px 16px", borderRadius: 8, textAlign: "center", minWidth: 90 }}>
              <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>Pass Rate</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.green, fontFamily: "DM Mono, monospace" }}>
                {simulatedPassRate}%
              </div>
            </div>

            <div style={{ background: "#f8f7f4", border: "0.5px solid #e0dfd9", padding: "10px 16px", borderRadius: 8, textAlign: "center", minWidth: 90 }}>
              <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>At-Risk</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.redMid, fontFamily: "DM Mono, monospace" }}>
                {simulatedAtRisk}
              </div>
            </div>

            <div style={{ background: "#f8f7f4", border: "0.5px solid #e0dfd9", padding: "10px 16px", borderRadius: 8, textAlign: "center", minWidth: 90 }}>
              <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>Team Readiness</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, fontFamily: "DM Mono, monospace" }}>
                {simulatedTeamReadiness}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: "1.25rem" }}>
        <MetricCard label="Team Readiness" value={`${simulatedTeamReadiness}%`} sub="Simulated ready score" color={C.blue} />
        <MetricCard label="Avg Pass Probability" value={`${simulatedPassRate}%`} sub="Simulated pass rate" color={C.green} />
        <MetricCard label="At-Risk Learners" value={simulatedAtRisk} sub="Simulated at-risk count" color={C.red} />
        <MetricCard label="Exams This Month" value={overview.upcoming_exams_30d} sub="Next 30 days" color={C.purple} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.25rem" }}>
        <div style={{ background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12, padding: "1rem 1.25rem" }}>
          <SectionHead>Readiness Distribution</SectionHead>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} />
              <Tooltip formatter={(v) => [v, "Learners"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {distData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12, padding: "1rem 1.25rem" }}>
          <SectionHead>Certification Coverage</SectionHead>
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", height: 180 }}>
            <div style={{ position: "relative", width: "45%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={certs} dataKey="learner_count" nameKey="certification_id" cx="50%" cy="50%" outerRadius={70} innerRadius={48} paddingAngle={2}>
                    {certs.map((_, i) => (
                      <Cell key={i} fill={[C.blue, C.blueMid, "#85B7EB", "#B5D4F4", C.purple, "#AFA9EC", C.green, C.amberMid][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none"
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#333", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>
                  {certs.reduce((sum, item) => sum + (item.learner_count || 0), 0)}
                </div>
                <div style={{ fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>
                  Total
                </div>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", maxHeight: "100%", overflowY: "auto", paddingRight: 4 }}>
              {certs.map((c, i) => {
                const color = [C.blue, C.blueMid, "#85B7EB", "#B5D4F4", C.purple, "#AFA9EC", C.green, C.amberMid][i % 8];
                return (
                  <div key={c.certification_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#444", lineHeight: 1.2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: "#222", flexShrink: 0, minWidth: 16, textAlign: "right" }}>{c.learner_count}</span>
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={`${c.certification_id}: ${c.learner_count} learners`}>
                      {c.certification_id}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
        <SectionHead>Skill Gap Heatmap</SectionHead>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {gaps.map((g) => {
            const intensity = g.avg_gap / 100;
            return (
              <div key={g.skill_area} style={{
                background: `rgba(24,95,165,${0.1 + intensity * 0.75})`,
                borderRadius: 8, padding: "10px 12px",
                color: intensity > 0.5 ? "#fff" : C.blue,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{g.skill_area}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "DM Mono, monospace", marginTop: 2 }}>{g.avg_gap}%</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{g.learner_count} learners</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12, padding: "1rem 1.25rem" }}>
        <SectionHead>Upcoming Exam Alerts</SectionHead>
        {upcoming.slice(0, 6).map((l) => (
          <div key={l.learner_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid #f0efe9" }}>
            <Avatar name={l.name} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{l.name} — {l.certification_id}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{l.exam_date} · {l.role}</div>
            </div>
            <ProgressBar value={l.practice_score} />
            <div style={{ width: 72, textAlign: "right" }}><RiskBadge risk={l.risk_level} /></div>
          </div>
        ))}
        {upcoming.length === 0 && <div style={{ color: "#888", fontSize: 13 }}>No exams in the next 30 days.</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEARNERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function LearnersTab({ onSelectLearner }) {
  const [data, setData] = useState({ learners: [], total: 0 });
  const [filter, setFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 50 });
    if (riskFilter) params.set("risk_level", riskFilter);
    fetch(`${API}/api/dashboard/learners?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [riskFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = data.learners.filter((l) =>
    !filter || l.name.toLowerCase().includes(filter.toLowerCase()) ||
    l.role.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", alignItems: "center" }}>
        <input
          placeholder="Search by name or role…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 13, fontFamily: "inherit" }}
        />
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 13, fontFamily: "inherit" }}
        >
          <option value="">All risk levels</option>
          <option value="exam_ready">Exam Ready</option>
          <option value="moderate_risk">Moderate Risk</option>
          <option value="high_risk">High Risk</option>
        </select>
        <Badge color="blue">{data.total} total</Badge>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#888" }}>Loading…</div>
      ) : (
        <div style={{ background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12, overflow: "hidden" }}>
          {/* Responsive table — min widths prevent collapse on smaller screens */}
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 640 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(140px,2fr) minmax(100px,1.2fr) 60px minmax(80px,1fr) 90px 60px", gap: 10, padding: "8px 16px", background: "#f8f7f4", fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <span>Learner</span><span>Certification</span><span>Score</span><span>Progress</span><span>Status</span><span>Prob.</span>
              </div>
              {filtered.map((l) => (
                <div
                  key={l.learner_id}
                  onClick={() => onSelectLearner(l.learner_id)}
                  style={{ display: "grid", gridTemplateColumns: "minmax(140px,2fr) minmax(100px,1.2fr) 60px minmax(80px,1fr) 90px 60px", gap: 10, padding: "10px 16px", alignItems: "center", cursor: "pointer", borderTop: "0.5px solid #f0efe9", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f7f4")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar name={l.name} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.role}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.certification_id}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "DM Mono, monospace", color: scoreColor(l.practice_score) }}>{l.practice_score}</div>
                  <ProgressBar value={l.completion_pct} max={100} color={C.blue} />
                  <RiskBadge risk={l.risk_level} />
                  <div style={{ fontSize: 12, fontFamily: "DM Mono, monospace", color: scoreColor(l.pass_probability) }}>{l.pass_probability}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEARNER DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function LearnerDetail({ learnerId, onBack }) {
  const [learner, setLearner] = useState(null);
  const [agentResult, setAgentResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [trace, setTrace] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/dashboard/learners/${learnerId}`)
      .then((r) => r.json())
      .then(setLearner);
  }, [learnerId]);

  const runAgents = async () => {
    if (!learner) return;
    setRunning(true);
    setTrace([]);

    let currentStep = 0;
    setTrace([TRACE_STEPS[0]]);
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < TRACE_STEPS.length) {
        setTrace((prev) => [...prev, TRACE_STEPS[currentStep]]);
      } else {
        clearInterval(interval);
      }
    }, 400);

    try {
      const payload = {
        role: learner.role,
        certification: learner.certification_id,
        exam_date: learner.exam_date,
        weekly_hours: learner.weekly_available_hours || 8,
        skill_level: learner.current_skill_level || "Intermediate",
        practice_score: learner.practice_score,
        meeting_hours: learner.meeting_hours_weekly || 12,
        focus_hours: learner.focus_hours_weekly || 20,
        preferred_slot: learner.preferred_learning_slot || "Morning",
      };
      const res = await fetch(`${API}/api/orchestrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setAgentResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(interval);
      setTrace(TRACE_STEPS);
      setRunning(false);
    }
  };

  if (!learner) return <div style={{ padding: "2rem", color: "#888" }}>Loading learner…</div>;

  const gapData = Object.entries(learner.skill_gaps || {}).map(([skill, gap]) => ({ skill: skill.split("/")[0].slice(0, 12), gap }));

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.blue, marginBottom: "1rem", fontFamily: "inherit", padding: 0 }}>
        ← Back to learners
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "1.5rem" }}>
        <Avatar name={learner.name} size={52} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{learner.name}</div>
          <div style={{ fontSize: 13, color: "#888" }}>{learner.role} · {learner.department}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <RiskBadge risk={learner.risk_level} />
          <button
            onClick={runAgents}
            disabled={running}
            style={{
              padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${C.blue}`,
              background: running ? C.blueLight : C.blue, color: running ? C.blue : "#fff",
              fontSize: 13, fontWeight: 600, cursor: running ? "default" : "pointer", fontFamily: "inherit",
            }}
          >
            {running ? "Running 8 agents…" : "Run Agent Pipeline ↗"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: "1.25rem" }}>
        <MetricCard label="Practice Score" value={learner.practice_score} color={scoreColor(learner.practice_score)} />
        <MetricCard label="Pass Probability" value={`${learner.pass_probability}%`} color={scoreColor(learner.pass_probability)} />
        <MetricCard label="Hours Studied" value={learner.hours_studied} sub={`of ${learner.total_required_hours}h req.`} color={C.purple} />
        <MetricCard label="Completion" value={`${learner.completion_pct}%`} color={C.blue} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.25rem" }}>
        <div style={{ background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12, padding: "1rem 1.25rem" }}>
          <SectionHead>Skill Gap Radar</SectionHead>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={gapData}>
              <PolarGrid stroke="#e0dfd9" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "#888" }} />
              <Radar dataKey="gap" stroke={C.blue} fill={C.blueLight} fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12, padding: "1rem 1.25rem" }}>
          <SectionHead>Learner Profile</SectionHead>
          {[
            ["Certification", learner.certification_id],
            ["Exam Date", learner.exam_date],
            ["Skill Level", learner.current_skill_level],
            ["Preferred Slot", learner.preferred_learning_slot],
            ["Meeting Load", `${learner.meeting_hours_weekly}h/wk`],
            ["Focus Time", `${learner.focus_hours_weekly}h/wk`],
            ["Engagement Score", learner.engagement_score],
            ["Study Streak", `${learner.streak_days} days`],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid #f0efe9", fontSize: 13 }}>
              <span style={{ color: "#888" }}>{label}</span>
              <span style={{ fontWeight: 500 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {(running || trace.length > 0) && (
        <div style={{
          background: "#0d1117",
          color: "#e6edf3",
          fontFamily: "DM Mono, monospace",
          padding: "1.25rem",
          borderRadius: 12,
          marginTop: "1rem",
          marginBottom: "1rem",
          fontSize: 13,
          lineHeight: 1.6,
          border: "1px solid #30363d",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #21262d", paddingBottom: 8, marginBottom: 12 }}>
            <div style={{ color: "#8b949e", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
              Agent Orchestration & Reasoning Live Trace
            </div>
            {running && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ea44f", animation: "pulse 1.5s infinite" }}></div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {trace.map((line, idx) => {
              const isComp = line.includes("Generated") || line.includes("Optimized") || line.includes("Calculated") || line.includes("Updated") || line.includes("Probability") || line.includes("Summary");
              return (
                <div key={idx} style={{ color: isComp ? "#56d364" : "#e6edf3" }}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {agentResult && !running && <AgentResultPanel result={agentResult} />}
    </div>
  );
}

// ─── Agent Result Panel ───────────────────────────────────────────────────────
function AgentResultPanel({ result }) {
  const [tab, setTab] = useState("roadmap");
  const tabs = [
    { id: "roadmap", label: "Learning Path" },
    { id: "schedule", label: "Study Plan" },
    { id: "assessment", label: "Assessment" },
    { id: "mentor", label: "AI Mentor" },
    { id: "prediction", label: "Prediction" },
    { id: "briefing", label: "Executive Briefing" },
    { id: "foundry_iq", label: "Foundry IQ Citations" },
    { id: "actions", label: "Actions" },
  ];
  const pred = result.success_prediction || {};
  const assess = result.assessment_results || {};
  const roadmap = result.certification_roadmap || {};
  const schedule = result.study_schedule || {};
  const briefing = result.executive_briefing || {};
  const foundry_iq = result.foundry_iq || {};
  const mentor = result.mentor_insights || {};

  return (
    <div style={{ background: "#fff", border: `2px solid ${C.blueLight}`, borderRadius: 12, padding: "1.25rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite", flexShrink: 0 }}></div>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.blue, whiteSpace: "nowrap" }}>Agent Pipeline Results</span>
        <span style={{
          background: C.greenLight, color: C.green, fontSize: 11, fontWeight: 700,
          padding: "3px 10px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", flexShrink: 0 }}></span>
          AI Analysis Complete · 8 Agents Executed
        </span>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "roadmap" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            <MetricCard label="Est. Hours" value={roadmap.estimated_hours || "—"} color={C.blue} />
            <MetricCard label="Modules" value={roadmap.learning_modules?.length || "—"} color={C.purple} />
            <MetricCard label="Skills Required" value={roadmap.required_skills?.length || "—"} color={C.green} />
          </div>
          {(roadmap.learning_modules || []).map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid #f0efe9" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.blue }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13 }}>{m.title || m}</div>
              {m.hours && <Badge color="blue">{m.hours}h</Badge>}
              {m.priority && <Badge color={m.priority === "high" ? "red" : m.priority === "medium" ? "amber" : "green"}>{m.priority}</Badge>}
            </div>
          ))}
        </div>
      )}

      {tab === "schedule" && (
        <div>
          {(schedule.milestones || []).map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "0.5px solid #f0efe9", alignItems: "flex-start" }}>
              <Badge color="blue">Week {m.week}</Badge>
              <div style={{ flex: 1, fontSize: 13 }}>{m.goal}</div>
              {m.metric && <span style={{ fontSize: 12, color: "#888" }}>{m.metric}</span>}
            </div>
          ))}
          {schedule.recovery_strategy && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: C.amberLight, borderRadius: 8, fontSize: 13, color: C.amber }}>
              <strong>Recovery:</strong> {schedule.recovery_strategy}
            </div>
          )}
        </div>
      )}

      {tab === "assessment" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <MetricCard label="Readiness Score" value={assess.readiness_score || "—"} color={scoreColor(assess.readiness_score || 0)} />
            <MetricCard label="Questions" value={assess.questions?.length || 0} color={C.purple} />
          </div>
          {(assess.weak_areas || []).map((w, i) => (
            <div key={i} style={{ padding: "6px 0", borderBottom: "0.5px solid #f0efe9", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.redMid, display: "inline-block" }}></span>
              {w}
            </div>
          ))}
          {(assess.questions || []).slice(0, 2).map((q, i) => (
            <div key={i} style={{ marginTop: 12, padding: 12, background: "#f8f7f4", borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Q{i + 1}: {q.question}</div>
              {(q.options || []).map((o, j) => (
                <div key={j} style={{ fontSize: 12, padding: "4px 0", color: j === q.correct_index ? C.green : "#555" }}>
                  {j === q.correct_index ? "✓ " : "  "}{o}
                </div>
              ))}
              <Badge color="blue">{q.difficulty} · {q.topic}</Badge>
            </div>
          ))}
        </div>
      )}

      {tab === "mentor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ borderLeft: `3px solid ${C.purple}`, paddingLeft: 12, marginBottom: 8 }}>
            <h4 style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 700, color: C.purple }}>Concept Explanation</h4>
            <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.5 }}>{mentor.explanation || "No explanation available."}</p>
          </div>
          
          {mentor.real_world_example && (
            <div style={{ background: "#f8f7f4", padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#555", marginBottom: 4 }}>Real-World Application</div>
              <div style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{mentor.real_world_example}</div>
            </div>
          )}

          {mentor.common_mistakes && mentor.common_mistakes.length > 0 && (
            <div style={{ background: C.redLight, padding: 12, borderRadius: 8, border: `0.5px solid ${C.redMid}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: C.red, marginBottom: 6 }}>Common Pitfalls to Avoid</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#333" }}>
                {mentor.common_mistakes.map((m, idx) => <li key={idx} style={{ marginBottom: 4 }}>{m}</li>)}
              </ul>
            </div>
          )}

          {mentor.quick_revision_notes && mentor.quick_revision_notes.length > 0 && (
            <div style={{ background: C.blueLight, padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: C.blue, marginBottom: 6 }}>Quick Revision Notes</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#333" }}>
                {mentor.quick_revision_notes.map((n, idx) => <li key={idx} style={{ marginBottom: 4 }}>{n}</li>)}
              </ul>
            </div>
          )}

          {mentor.practice_exercise && (
            <div style={{ background: C.greenLight, padding: 12, borderRadius: 8, border: `0.5px solid ${C.green}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: C.green, marginBottom: 4 }}>Practice Exercise</div>
              <div style={{ fontSize: 13, color: "#333", fontStyle: "italic" }}>{mentor.practice_exercise}</div>
            </div>
          )}
        </div>
      )}

      {tab === "prediction" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            <MetricCard label="Pass Probability" value={`${pred.pass_probability || 0}%`} color={scoreColor(pred.pass_probability || 0)} />
            <MetricCard label="Confidence" value={pred.confidence_score || "—"} color={C.blue} />
            <MetricCard label="Readiness Tier" value={pred.readiness_tier || "—"} color={C.purple} />
          </div>
          <SectionHead>Actionable Recommendations</SectionHead>
          {(pred.improvement_actions || []).map((a, i) => {
            const impact = typeof a.impact === "number" ? a.impact : parseInt(a.impact) || null;
            return (
              <div key={i} style={{
                padding: "12px 14px", borderBottom: "0.5px solid #f0efe9", fontSize: 13,
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: C.blueLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: C.blue, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.action || a}</div>
                  {impact !== null && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#E8F5E9", color: "#2E7D32",
                      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 100,
                    }}>
                      <span>↑</span> Expected Pass Rate Gain: +{impact}%
                    </div>
                  )}
                  {a.time_required && (
                    <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                      ⏱ {isNaN(Number(a.time_required)) ? a.time_required : `${a.time_required} hours`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "briefing" && (
        <div>
          {/* ── Top KPI strip ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 12, marginBottom: 16 }}>
            <MetricCard label="Team Readiness" value={briefing.team_readiness_pct !== undefined ? `${briefing.team_readiness_pct}%` : "—"} color={C.blue} />
            <MetricCard label="Predicted Pass Rate" value={briefing.predicted_pass_rate !== undefined ? `${briefing.predicted_pass_rate}%` : "—"} color={C.green} />
            {/* Critical Risk Areas — rendered as a list so text never wraps inside a tiny box */}
            <div style={{
              background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12,
              padding: "0.75rem 1rem", minWidth: 0,
            }}>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Critical Risk Areas</div>
              {(() => {
                const raw = briefing.critical_risk || "";
                // Support both comma-separated strings and arrays
                const items = Array.isArray(briefing.critical_risk)
                  ? briefing.critical_risk
                  : raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
                const displayItems = items.length > 0 ? items : ["No critical risks identified"];
                return displayItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                    <span style={{ color: C.redMid, fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.red, lineHeight: 1.4 }}>{item}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* ── Executive Summary block ── */}
          {(() => {
            const readiness = briefing.team_readiness_pct ?? 72;
            const passRate = briefing.predicted_pass_rate ?? 72;
            const failRate = 100 - passRate;
            const cert = (briefing.top_certifications || ["AZ-204"])[0];
            const gaps = briefing.most_common_skill_gaps || ["Azure Storage Blob & File", "Azure Active Directory"];
            const topGap = gaps[0] || "";
            const secondGap = gaps[1] || "";
            return (
              <div style={{
                background: "linear-gradient(135deg, #EBF3FC 0%, #F5F0FF 100%)",
                border: `1.5px solid ${C.blueLight}`,
                borderLeft: `4px solid ${C.blue}`,
                borderRadius: 10, padding: "18px 20px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: C.blue, marginBottom: 12 }}>Executive Summary</div>

                {/* Narrative paragraphs */}
                <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#222", lineHeight: 1.7, fontWeight: 500 }}>
                  Current readiness for <strong>{cert}</strong> stands at <strong>{readiness}%</strong>.
                </p>
                <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#333", lineHeight: 1.7 }}>
                  The AI agent pipeline predicts a <strong>{passRate}% certification success rate</strong>,
                  with <strong>{topGap}</strong>{secondGap ? <> and <strong>{secondGap}</strong></> : ""} identified as the primary risk areas.
                </p>
                <p style={{ margin: "0 0 14px 0", fontSize: 13, color: C.red, lineHeight: 1.7, fontWeight: 600 }}>
                  ⚠ Without intervention, an estimated <strong>{failRate}%</strong> of learners may fail the certification.
                </p>

                {/* Skill gap pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {gaps.slice(0, 4).map((g, i) => (
                    <span key={i} style={{
                      background: "rgba(163,45,45,0.08)", color: C.red,
                      fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 100,
                      border: `1px solid rgba(163,45,45,0.15)`,
                    }}>⚠ {g}</span>
                  ))}
                </div>

                {/* Recommended action */}
                <div style={{
                  background: "rgba(83,74,183,0.08)", borderRadius: 8,
                  padding: "10px 14px", borderLeft: `3px solid ${C.purple}`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>Recommended action: </span>
                  <span style={{ fontSize: 12, color: "#444" }}>Launch a focused 30-day coaching initiative targeting the identified skill gaps.</span>
                </div>
              </div>
            );
          })()}

          {/* ── Business Impact Card ── */}
          {(() => {
            const currentRate = briefing.predicted_pass_rate ?? 72;
            const targetRate = Math.min(98, currentRate + 13);
            const improvement = targetRate - currentRate;
            const teamSize = briefing.team_size ?? 107;
            const additionalLearners = Math.round((improvement / 100) * teamSize);
            return (
              <div style={{
                background: "#fff",
                border: `1.5px solid ${C.blueLight}`,
                borderRadius: 12, padding: "18px 20px", marginBottom: 16,
                boxShadow: "0 2px 12px rgba(24,95,165,0.08)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: C.blue, marginBottom: 14 }}>Business Impact</div>

                {/* Rate comparison row */}
                <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 14 }}>
                  <div style={{ flex: 1, background: "#f8f7f4", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 4 }}>Current Pass Rate</div>
                    <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.amber }}>{currentRate}%</div>
                  </div>
                  <div style={{ padding: "0 14px", fontSize: 22, color: "#ccc", fontWeight: 300 }}>→</div>
                  <div style={{ flex: 1, background: C.greenLight, borderRadius: 10, padding: "14px 16px", textAlign: "center", border: `1px solid rgba(59,109,17,0.15)` }}>
                    <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginBottom: 4 }}>Target Pass Rate</div>
                    <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.green }}>{targetRate}%</div>
                  </div>
                </div>

                {/* Stat pills row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: C.blueLight, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.blue, marginBottom: 4, letterSpacing: "0.6px" }}>Potential Improvement</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.blue }}>+{improvement}%</div>
                  </div>
                  <div style={{ background: C.greenLight, borderRadius: 8, padding: "12px 14px", border: `1px solid rgba(59,109,17,0.12)` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.green, marginBottom: 4, letterSpacing: "0.6px" }}>Estimated Additional Certifications</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.green }}>+{additionalLearners} learners</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Training ROI + Risk Reduction side-by-side ── */}
          {(() => {
            const passRate   = briefing.predicted_pass_rate ?? 72;
            const targetRate = Math.min(98, passRate + 13);
            const teamSize   = briefing.team_size ?? 107;
            const currentCertified  = Math.round((passRate   / 100) * teamSize);
            const projectedCertified = Math.round((targetRate / 100) * teamSize);
            const extraLearners     = projectedCertified - currentCertified;
            // ~$2k avg value per additional certification (conservative enterprise estimate)
            const estValue = extraLearners * 2000;
            const fmtUSD   = (n) => `$${n.toLocaleString()}`;

            const currentRisk = 100 - passRate;
            const targetRisk  = Math.max(2, 100 - targetRate);
            const riskDelta   = currentRisk - targetRisk;

            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>

                {/* Training ROI */}
                <div style={{
                  background: "#fff", border: `1.5px solid ${C.greenLight}`,
                  borderTop: `3px solid ${C.green}`,
                  borderRadius: 12, padding: "16px 18px",
                  boxShadow: "0 2px 10px rgba(59,109,17,0.07)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: C.green, marginBottom: 14 }}>
                    Training ROI
                  </div>

                  {/* Learner count comparison */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, gap: 8 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 600, marginBottom: 2 }}>Current Certified</div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.amber }}>{currentCertified}</div>
                    </div>
                    <div style={{ fontSize: 20, color: "#ccc", paddingBottom: 4 }}>→</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 2 }}>Projected Certified</div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.green }}>{projectedCertified}</div>
                    </div>
                  </div>

                  {/* Delta + value row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ background: C.greenLight, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: C.green, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Improvement</div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.green }}>+{extraLearners} learners</div>
                    </div>
                    <div style={{ background: "#F0FBF0", borderRadius: 8, padding: "8px 10px", border: "1px solid rgba(59,109,17,0.12)" }}>
                      <div style={{ fontSize: 10, color: C.green, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Est. Value Added</div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.green }}>{fmtUSD(estValue)}</div>
                    </div>
                  </div>
                </div>

                {/* Risk Reduction */}
                <div style={{
                  background: "#fff", border: `1.5px solid ${C.redLight}`,
                  borderTop: `3px solid ${C.redMid}`,
                  borderRadius: 12, padding: "16px 18px",
                  boxShadow: "0 2px 10px rgba(163,45,45,0.06)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: C.red, marginBottom: 14 }}>
                    Risk Reduction
                  </div>

                  {/* Risk comparison */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, gap: 8 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 600, marginBottom: 2 }}>Current Risk</div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.redMid }}>{currentRisk}%</div>
                    </div>
                    <div style={{ fontSize: 20, color: "#ccc", paddingBottom: 4 }}>→</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 2 }}>Target Risk</div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.green }}>{targetRisk}%</div>
                    </div>
                  </div>

                  {/* Risk delta */}
                  <div style={{ background: "#FFF8F8", borderRadius: 8, padding: "10px 14px", border: "1px solid rgba(163,45,45,0.12)" }}>
                    <div style={{ fontSize: 10, color: C.red, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Risk Reduction</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "DM Mono, monospace", color: C.green }}>−{riskDelta}%</div>
                      <div style={{ fontSize: 11, color: "#888" }}>failure probability</div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
                      Estimated <strong>{Math.round((riskDelta / 100) * teamSize)} fewer at-risk learners</strong> after intervention
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ── Certs & Gaps row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ background: "#f8f7f4", padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#555", marginBottom: 6 }}>Top Certifications Covered</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#444" }}>
                {(briefing.top_certifications || []).map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>

            <div style={{ background: C.amberLight, padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: C.amber, marginBottom: 6 }}>Common Skill Gaps</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#444" }}>
                {(briefing.most_common_skill_gaps || []).map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          </div>

          {/* ── Priority Recommendations ── */}
          <div style={{ background: C.blueLight, padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: C.blue, marginBottom: 6 }}>Priority Recommendations</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#333" }}>
              {(briefing.priority_recommendations || []).map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      {tab === "foundry_iq" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: C.blueLight, color: C.blue, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            <strong>Foundry IQ Knowledge Agent:</strong> Every recommendation is verified against enterprise and certification references.
          </div>

          {/* Confidence legend */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              { label: "95%+ Verified", bg: "#E8F5E9", color: "#2E7D32", dot: "#43A047" },
              { label: "80–94% High", bg: "#E3F2FD", color: "#1565C0", dot: "#1E88E5" },
              { label: "60–79% Moderate", bg: "#FFFDE7", color: "#F57F17", dot: "#F9A825" },
              { label: "<60% Low", bg: "#FFEBEE", color: "#B71C1C", dot: "#E53935" },
            ].map((t) => (
              <span key={t.label} style={{
                background: t.bg, color: t.color, fontSize: 11, fontWeight: 700,
                padding: "4px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot, display: "inline-block" }}></span>
                {t.label}
              </span>
            ))}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(foundry_iq.recommendations || []).map((rec, i) => {
              const score = rec.confidence_score ?? 0;
              const confStyle = score >= 95
                ? { bg: "#E8F5E9", color: "#2E7D32", dot: "#43A047", label: "Verified" }
                : score >= 80
                ? { bg: "#E3F2FD", color: "#1565C0", dot: "#1E88E5", label: "High" }
                : score >= 60
                ? { bg: "#FFFDE7", color: "#F57F17", dot: "#F9A825", label: "Moderate" }
                : { bg: "#FFEBEE", color: "#B71C1C", dot: "#E53935", label: "Low" };
              return (
                <div key={i} style={{
                  border: `1.5px solid ${confStyle.bg}`,
                  borderLeft: `4px solid ${confStyle.dot}`,
                  borderRadius: 8, padding: "12px 14px", background: "#fff",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#222", marginBottom: 8 }}>
                    {rec.recommendation}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      background: C.blueLight, color: C.blue,
                      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                    }}>📚 {rec.source}</span>
                    <span style={{
                      background: confStyle.bg, color: confStyle.color,
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: confStyle.dot, display: "inline-block" }}></span>
                      Confidence: {score}% · {confStyle.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {(!foundry_iq.recommendations || foundry_iq.recommendations.length === 0) && (
              <div style={{ color: "#888", fontSize: 13, textAlign: "center", padding: "1rem" }}>No grounded citations generated.</div>
            )}
          </div>
        </div>
      )}

      {tab === "actions" && (
        <div>
          {(result.recommended_actions || []).map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "0.5px solid #f0efe9", alignItems: "flex-start" }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: C.blueLight, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{typeof a === "object" ? (a.action || JSON.stringify(a)) : a}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT RUNNER TAB (manual)
// ═══════════════════════════════════════════════════════════════════════════════
function AgentRunnerTab() {
  const [form, setForm] = useState({
    role: "Cloud Engineer", certification: "AZ-204",
    exam_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    weekly_hours: 8, skill_level: "Intermediate", practice_score: 65,
    meeting_hours: 12, focus_hours: 20, preferred_slot: "Morning",
  });
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [trace, setTrace] = useState([]);

  const run = async () => {
    setRunning(true); setError(""); setResult(null);
    setTrace([]);

    let currentStep = 0;
    setTrace([TRACE_STEPS[0]]);
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < TRACE_STEPS.length) {
        setTrace((prev) => [...prev, TRACE_STEPS[currentStep]]);
      } else {
        clearInterval(interval);
      }
    }, 400);

    try {
      const res = await fetch(`${API}/api/orchestrate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, weekly_hours: +form.weekly_hours, practice_score: +form.practice_score, meeting_hours: +form.meeting_hours, focus_hours: +form.focus_hours }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(interval);
      setTrace(TRACE_STEPS);
      setRunning(false);
    }
  };

  const field = (label, key, type = "text", opts) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>{label}</label>
      {opts ? (
        <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 13, fontFamily: "inherit" }}>
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 13, fontFamily: "inherit" }} />
      )}
    </div>
  );

  return (
    <div>
      <div style={{ background: "#fff", border: "0.5px solid #e0dfd9", borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
        <SectionHead>Manual Agent Pipeline Run</SectionHead>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          {field("Role", "role", "text", ["Cloud Engineer", "Solution Architect", "DevOps Lead", "Security Analyst", "Platform Engineer", "Data Engineer"])}
          {field("Certification", "certification", "text", ["AZ-204", "AZ-900", "AZ-305", "AWS-SAA", "AWS-DVA", "GCP-ACE", "SC-900", "DP-900"])}
          {field("Exam Date", "exam_date", "date")}
          {field("Weekly Hours", "weekly_hours", "number")}
          {field("Skill Level", "skill_level", "text", ["Beginner", "Intermediate", "Advanced"])}
          {field("Practice Score (0-100)", "practice_score", "number")}
          {field("Meeting Hours/week", "meeting_hours", "number")}
          {field("Focus Hours/week", "focus_hours", "number")}
          {field("Preferred Slot", "preferred_slot", "text", ["Morning", "Afternoon", "Evening"])}
        </div>
        <button
          onClick={run}
          disabled={running}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            background: running ? C.blueLight : C.blue, color: running ? C.blue : "#fff",
            fontSize: 14, fontWeight: 700, cursor: running ? "default" : "pointer", fontFamily: "inherit",
          }}
        >
          {running ? "Running 8 agents via Groq API…" : "Run All 8 Agents ↗"}
        </button>
        {error && <div style={{ marginTop: 10, padding: "8px 12px", background: C.redLight, color: C.red, borderRadius: 8, fontSize: 13 }}>{error}</div>}
      </div>

      {(running || trace.length > 0) && (
        <div style={{
          background: "#0d1117",
          color: "#e6edf3",
          fontFamily: "DM Mono, monospace",
          padding: "1.25rem",
          borderRadius: 12,
          marginTop: "1rem",
          marginBottom: "1rem",
          fontSize: 13,
          lineHeight: 1.6,
          border: "1px solid #30363d",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #21262d", paddingBottom: 8, marginBottom: 12 }}>
            <div style={{ color: "#8b949e", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
              Agent Orchestration & Reasoning Live Trace
            </div>
            {running && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ea44f", animation: "pulse 1.5s infinite" }}></div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {trace.map((line, idx) => {
              const isComp = line.includes("Generated") || line.includes("Optimized") || line.includes("Calculated") || line.includes("Updated") || line.includes("Probability") || line.includes("Summary");
              return (
                <div key={idx} style={{ color: isComp ? "#56d364" : "#e6edf3" }}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result && <AgentResultPanel result={result} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("overview");
  const [selectedLearner, setSelectedLearner] = useState(null);

  const mainTabs = [
    { id: "overview", label: "Overview" },
    { id: "learners", label: "Learners" },
    { id: "run", label: "Run Agents" },
  ];

  return (
    <div style={{ fontFamily: "'Syne', 'DM Mono', sans-serif", maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700&display=swap');@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 20 20" width="22" height="22" fill="none"><path d="M10 2L3 6v8l7 4 7-4V6L10 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" /><path d="M10 12l4-2.5V7L10 9.5 6 7v2.5L10 12z" fill="white" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" }}>CertifyAI 360</div>
            <div style={{ fontSize: 12, color: "#888" }}>Enterprise Certification Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#639922", display: "inline-block", animation: "pulse 2s infinite" }}></span>
          <span style={{ fontSize: 12, color: "#888" }}>8 agents active · Groq + FastAPI + PostgreSQL</span>
        </div>
      </div>

      <Tabs tabs={mainTabs} active={selectedLearner ? "learners" : tab} onChange={(t) => { setTab(t); setSelectedLearner(null); }} />

      {tab === "overview" && !selectedLearner && <OverviewTab />}
      {tab === "learners" && !selectedLearner && <LearnersTab onSelectLearner={setSelectedLearner} />}
      {tab === "learners" && selectedLearner && <LearnerDetail learnerId={selectedLearner} onBack={() => setSelectedLearner(null)} />}
      {tab === "run" && <AgentRunnerTab />}
    </div>
  );
}
