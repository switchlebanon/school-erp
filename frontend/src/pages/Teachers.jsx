import { C } from "../theme";
import { Badge, Card } from "../components/Shared";
import { teachers } from "../data/mockData";

export default function Teachers() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Teachers</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>{teachers.length} staff members</p>
        </div>
        <button style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          + Add Teacher
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {teachers.map(t => (
          <Card key={t.id} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.greenL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.green, fontSize: 18, flexShrink: 0 }}>
              {t.name.split(" ").pop().charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{t.name}</div>
              <div style={{ color: C.accent, fontSize: 13, fontWeight: 600 }}>{t.subject}</div>
              <div style={{ color: C.slate, fontSize: 12, marginTop: 3 }}>Sections: {t.sections}</div>
            </div>
            <Badge {...(t.status === "Active" ? { color: C.green, bg: C.greenL } : { color: C.amber, bg: C.amberL })} label={t.status} />
          </Card>
        ))}
      </div>
    </div>
  );
}
