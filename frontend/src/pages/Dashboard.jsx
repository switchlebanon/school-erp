import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { C } from "../theme";
import { Card, SectionTitle } from "../components/Shared";
import { api } from "../api/client";

const fmt$ = (n) => "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

export default function Dashboard({ user }) {
  const isParent = user?.role === "PARENT";

  if (isParent) return <ParentDashboard user={user} />;
  return <AdminDashboard user={user} />;
}

function ParentDashboard({ user }) {
  const [children, setChildren] = useState([]);
  const [notices, setNotices]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/students").catch(() => []),
      api.get("/announcements?limit=5").catch(() => []),
    ]).then(([kids, announcements]) => {
      setChildren(Array.isArray(kids) ? kids : []);
      setNotices(Array.isArray(announcements) ? announcements.slice(0, 5) : []);
    }).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>
          {greeting}, {user?.name?.split(" ")[0] || "Parent"} 👋
        </h1>
        <p style={{ color: C.textMid, fontSize: 13, margin: "4px 0 0" }}>{today}</p>
      </div>

      {/* Children summary */}
      <Card>
        <SectionTitle>My Children</SectionTitle>
        {loading ? (
          <div style={{ fontSize: 13, color: C.slate }}>Loading…</div>
        ) : children.length === 0 ? (
          <div style={{ fontSize: 13, color: C.slate }}>No children linked to your account yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {children.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: C.slateL, borderRadius: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.accentL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: C.accent, flexShrink: 0 }}>
                  {c.name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: C.slate }}>{c.studentCode} · {c.section?.gradeLevel?.name} – {c.section?.name}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.status === "ACTIVE" ? C.green : C.amber, background: c.status === "ACTIVE" ? C.greenL : C.amberL, padding: "3px 10px", borderRadius: 20 }}>
                  {c.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notices */}
      <Card style={{ padding: 18 }}>
        <SectionTitle>Latest Notices</SectionTitle>
        {notices.length === 0 ? (
          <div style={{ fontSize: 13, color: C.slate }}>No announcements yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notices.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.slateL, borderRadius: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: C.accentL, color: C.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>{a.type}</span>
                <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{a.title}</span>
                <span style={{ fontSize: 11, color: C.slate }}>{new Date(a.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminDashboard({ user }) {
  const [stats, setStats]           = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [notices, setNotices]       = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      api.get("/students?status=ACTIVE").catch(() => []),
      api.get("/teachers").catch(() => []),
      api.get("/employees").catch(() => []),
      api.get("/fees/summary").catch(() => null),
      api.get("/announcements?limit=5").catch(() => []),
    ]).then(([students, teachers, employees, feeSummary, announcements]) => {
      setStats({
        students: Array.isArray(students) ? students.length : 0,
        teachers: Array.isArray(teachers) ? teachers.length : 0,
        employees: Array.isArray(employees) ? employees.length : 0,
        feesCollected: feeSummary?.collected || 0,
        feesPending: feeSummary?.pending || 0,
      });
      setNotices(Array.isArray(announcements) ? announcements.slice(0, 5) : []);
    }).finally(() => setLoading(false));
  }, []);

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>
          {greeting}, {user?.name?.split(" ")[0] || "Admin"} 👋
        </h1>
        <p style={{ color: C.textMid, fontSize: 13, margin: "4px 0 0" }}>{today}</p>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {[1,2,3,4].map(i => (
            <Card key={i} style={{ padding: 16, height: 88, background: C.slateL, border: "none" }} />
          ))}
        </div>
      ) : stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {[
            { label: "Total Students",   value: stats.students,   icon: "👤", color: C.accent, bg: C.accentL, sub: "active" },
            { label: "Teachers",         value: stats.teachers,   icon: "🎓", color: C.green,  bg: C.greenL,  sub: "staff members" },
            { label: "Fees Collected",   value: fmt$(stats.feesCollected), icon: "✅", color: C.green, bg: C.greenL, sub: fmt$(stats.feesPending) + " pending" },
            { label: "Other Staff",      value: stats.employees,  icon: "🧑‍💼", color: C.slate, bg: C.slateL,  sub: "employees" },
          ].map(s => (
            <Card key={s.label} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textMid, fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.slate, marginTop: 5 }}>{s.sub}</div>
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: s.bg, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>{s.icon}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Latest Notices */}
      <Card style={{ padding: 18 }}>
        <SectionTitle>Latest Notices</SectionTitle>
        {notices.length === 0 ? (
          <div style={{ fontSize: 13, color: C.slate }}>No announcements yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notices.map(a => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", background: C.slateL, borderRadius: 8, flexWrap: "wrap",
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  background: C.accentL, color: C.accent, textTransform: "uppercase", letterSpacing: "0.05em",
                }}>{a.type}</span>
                <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500, minWidth: 120 }}>{a.title}</span>
                <span style={{ fontSize: 11, color: C.slate }}>{fmtDate(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Links */}
      <Card style={{ padding: 18 }}>
        <SectionTitle>Quick Actions</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {[
            { label: "Add Student",   icon: "➕", page: "students" },
            { label: "Mark Attendance", icon: "📋", page: "attendance" },
            { label: "Record Payment",  icon: "💳", page: "fees" },
            { label: "Run Payroll",     icon: "💰", page: "payroll" },
          ].map(q => (
            <button key={q.label} style={{
              background: C.slateL, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "14px 10px", textAlign: "center", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}
              onClick={() => {
                // Navigate using the app's nav system
                const event = new CustomEvent("s3-nav", { detail: q.page });
                window.dispatchEvent(event);
              }}
            >
              <span style={{ fontSize: 24 }}>{q.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid }}>{q.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
