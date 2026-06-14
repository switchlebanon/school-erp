import { C } from "../theme";
import { Card } from "../components/Shared";
import { timetable, subjectColors } from "../data/mockData";

export default function Timetable() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const rows = timetable["Grade 9A"];

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: C.text }}>Timetable</h2>
      <p style={{ color: C.textMid, fontSize: 13, margin: "0 0 16px" }}>Grade 9A — Current week</p>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 460 }}>
            <thead>
              <tr style={{ background: C.navy }}>
                <th style={{ padding: "11px 14px", color: "#7B93BE", fontWeight: 600, fontSize: 11, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em" }}>Time</th>
                {days.map(d => (
                  <th key={d} style={{ padding: "11px 14px", color: C.white, fontWeight: 600, fontSize: 12, textAlign: "center" }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", color: C.slate, fontWeight: 500, fontSize: 12, whiteSpace: "nowrap" }}>{row.time}</td>
                  {days.map(d => {
                    const subj = row[d];
                    const color = subjectColors[subj] || C.slate;
                    return (
                      <td key={d} style={{ padding: "8px", textAlign: "center" }}>
                        <div style={{ display: "inline-block", padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: color + "22", color }}>
                          {subj}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        {Object.entries(subjectColors).filter(([k]) => k !== "Free").map(([sub, color]) => (
          <div key={sub} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textMid }}>
            <div style={{ width: 9, height: 9, borderRadius: 3, background: color }} />{sub}
          </div>
        ))}
      </div>
    </div>
  );
}
