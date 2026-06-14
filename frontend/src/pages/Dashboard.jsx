import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { C } from "../theme";
import { Badge, Card, SectionTitle, priorityColor } from "../components/Shared";
import { attendanceData, gradeDistribution, announcements } from "../data/mockData";

export default function Dashboard({ user }) {
  const stats = [
    { label: "Total Students",    value: "468",    icon: "👤", color: C.accent,  bg: C.accentL,  delta: "+12 this term" },
    { label: "Teachers",          value: "32",     icon: "🎓", color: C.green,   bg: C.greenL,   delta: "2 on leave" },
    { label: "Attendance Today",  value: "95.2%",  icon: "📋", color: C.amber,   bg: C.amberL,   delta: "↑ from 93% yesterday" },
    { label: "Fees Collected",    value: "$21k",   icon: "💳", color: C.purple,  bg: C.purpleL,  delta: "Jan 2026" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Good morning, {user?.name || "Admin"} 👋</h1>
        <p style={{ color: C.textMid, fontSize: 13, margin: "4px 0 0" }}>Here's what's happening today.</p>
      </div>

      {/* Stat Cards — 2×2 grid that never squishes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, color: C.textMid, fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 5 }}>{s.delta}</div>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: s.bg, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts — stack vertically so they always have room */}
      <Card style={{ padding: 18 }}>
        <SectionTitle>Weekly Attendance</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={attendanceData} barSize={20} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: C.slate }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} width={32} />
            <Tooltip cursor={{ fill: C.slateL }} />
            <Bar dataKey="present" fill={C.accent} radius={[4, 4, 0, 0]} name="Present" />
            <Bar dataKey="absent"  fill="#FCA5A5"  radius={[4, 4, 0, 0]} name="Absent" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle>Grade Distribution</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ResponsiveContainer width="50%" height={160}>
            <PieChart>
              <Pie data={gradeDistribution} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3} dataKey="value">
                {gradeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v + " students", n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {gradeDistribution.map(g => (
              <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textMid }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: g.color, flexShrink: 0 }} />
                <span>{g.name}</span>
                <span style={{ fontWeight: 700, color: C.text, marginLeft: "auto" }}>{g.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Latest Notices */}
      <Card style={{ padding: 18 }}>
        <SectionTitle>Latest Notices</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {announcements.map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", background: C.slateL, borderRadius: 8,
              flexWrap: "wrap",
            }}>
              <Badge label={a.type} color={C.accent} bg={C.accentL} />
              <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500, minWidth: 120 }}>{a.title}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <Badge {...priorityColor(a.priority)} label={a.priority} />
                <span style={{ fontSize: 11, color: C.slate }}>{a.date}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
