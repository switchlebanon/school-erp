import { useState } from "react";
import { C } from "../theme";
import { mockStudents as students } from "../data/mockData";

export default function Attendance() {
  const [marks, setMarks] = useState(Object.fromEntries(students.map(s => [s.id, "present"])));
  const toggle = (id) => setMarks(m => ({ ...m, [id]: m[id] === "present" ? "absent" : "present" }));
  const presentCount = Object.values(marks).filter(v => v === "present").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Attendance</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>Today</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 13, color: C.textMid }}>
            <b style={{ color: C.green }}>{presentCount}</b> present · <b style={{ color: C.red }}>{students.length - presentCount}</b> absent
          </div>
          <button style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {students.map(s => (
          <div key={s.id} onClick={() => toggle(s.id)}
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 10, cursor: "pointer",
              border: `2px solid ${marks[s.id] === "present" ? C.green : C.red}`,
              background: marks[s.id] === "present" ? C.greenL : C.redL,
              transition: "all 0.15s",
            }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: marks[s.id] === "present" ? C.green : C.red, flexShrink: 0 }}>
              {s.name.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{s.name}</div>
              <div style={{ fontSize: 12, color: C.slate }}>{s.grade} · Section {s.section}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: marks[s.id] === "present" ? C.green : C.red }}>
              {marks[s.id] === "present" ? "✓ Present" : "✗ Absent"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
