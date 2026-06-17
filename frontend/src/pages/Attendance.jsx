import { useState, useEffect } from "react";
import { C } from "../theme";
import { Card } from "../components/Shared";
import { api } from "../api/client";

const STATUSES = [
  { key: "PRESENT", label: "Present", icon: "✓", color: C.green, bg: C.greenL },
  { key: "ABSENT",  label: "Absent",  icon: "✗", color: C.red,   bg: C.redL   },
  { key: "LATE",    label: "Late",    icon: "⏰", color: C.amber, bg: C.amberL },
  { key: "EXCUSED", label: "Excused", icon: "📝", color: C.accent, bg: C.accentL },
];

const statusInfo = (key) => STATUSES.find(s => s.key === key) || STATUSES[0];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayStr());

  const [rows, setRows] = useState([]);
  const [marks, setMarks] = useState({}); // studentId -> status (only for changes)

  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // Load class list
  useEffect(() => {
    api.get("/sections")
      .then(data => {
        setSections(data);
        if (data.length > 0) setSectionId(String(data[0].id));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingSections(false));
  }, []);

  // Load attendance for selected class/date
  const fetchAttendance = () => {
    if (!sectionId || !date) return;
    setLoadingRows(true);
    setError("");
    setSaveMessage("");
    api.get(`/attendance?sectionId=${sectionId}&date=${date}`)
      .then(data => {
        setRows(data);
        setMarks({});
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingRows(false));
  };

  useEffect(() => { fetchAttendance(); }, [sectionId, date]);

  const getMark = (studentId, row) => marks[studentId] ?? { status: row.status ?? "PRESENT", reason: row.reason ?? "" };

  const setStatus = (studentId, row, status) => {
    setMarks(prev => {
      const current = prev[studentId] ?? { status: row.status ?? "PRESENT", reason: row.reason ?? "" };
      // Clear reason when switching to PRESENT
      const reason = status === "PRESENT" ? "" : current.reason;
      return { ...prev, [studentId]: { status, reason } };
    });
  };

  const setReason = (studentId, row, reason) => {
    setMarks(prev => {
      const current = prev[studentId] ?? { status: row.status ?? "PRESENT", reason: row.reason ?? "" };
      return { ...prev, [studentId]: { ...current, reason } };
    });
  };

  const markAllPresent = () => {
    const next = {};
    rows.forEach(r => { next[r.studentId] = { status: "PRESENT", reason: "" }; });
    setMarks(next);
  };

  const hasChanges = Object.keys(marks).length > 0;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaveMessage("");
    try {
      const records = rows.map(r => {
        const m = getMark(r.studentId, r);
        return { studentId: r.studentId, status: m.status, reason: m.reason || undefined };
      });
      const result = await api.post("/attendance/bulk", { date, records });
      setSaveMessage(`✓ Saved attendance for ${result.summary.saved} student${result.summary.saved !== 1 ? "s" : ""}`);
      fetchAttendance();
    } catch (err) {
      setError(err.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const counts = rows.reduce((acc, r) => {
    const m = getMark(r.studentId, r);
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  const selectedSection = sections.find(s => String(s.id) === sectionId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Attendance</h2>
        <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>Mark daily attendance by class</p>
      </div>

      {error && (
        <Card style={{ borderColor: C.red, background: C.redL }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Class</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", background: C.white,
            }} disabled={loadingSections}>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.gradeLevel.name} – {s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayStr()} style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none",
            }} />
          </div>
          <button onClick={markAllPresent} style={{
            background: C.greenL, color: C.green, border: "none", borderRadius: 8,
            padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            ✓ Mark All Present
          </button>
        </div>
      </Card>

      {/* Stats */}
      {rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
          {STATUSES.map(s => (
            <Card key={s.key} style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{counts[s.key] || 0}</div>
              <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Class roster */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            {selectedSection ? `${selectedSection.gradeLevel.name} – ${selectedSection.name}` : "—"}
            {" · "}
            {new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {saveMessage && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{saveMessage}</span>}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving || rows.length === 0}
              style={{
                background: hasChanges ? C.accent : C.border,
                color: C.white, border: "none", borderRadius: 8,
                padding: "8px 18px", fontWeight: 600, fontSize: 13,
                cursor: hasChanges && !saving ? "pointer" : "default",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : hasChanges ? `Save Changes (${Object.keys(marks).length})` : "Save"}
            </button>
          </div>
        </div>

        {loadingRows ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>No active students in this class.</div>
        ) : (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map(r => {
              const mark = getMark(r.studentId, r);
              const current = mark.status;
              const info = statusInfo(current);
              const isEdited = marks[r.studentId] !== undefined;
              const showReason = current !== "PRESENT";
              return (
                <div key={r.studentId} style={{
                  display: "flex", flexDirection: "column", gap: 10, padding: "11px 14px", borderRadius: 10,
                  border: `1px solid ${isEdited ? info.color : C.border}`,
                  background: isEdited ? info.bg : C.white,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: C.slateL,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 14, color: C.textMid, flexShrink: 0,
                    }}>
                      {r.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: C.slate }}>{r.studentCode}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {STATUSES.map(s => (
                        <button
                          key={s.key}
                          onClick={() => setStatus(r.studentId, r, s.key)}
                          style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            border: `1.5px solid ${current === s.key ? s.color : C.border}`,
                            background: current === s.key ? s.bg : C.white,
                            color: current === s.key ? s.color : C.textMid,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                        >
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {showReason && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 50 }}>
                      <span style={{ fontSize: 12, color: C.slate, whiteSpace: "nowrap" }}>
                        {current === "EXCUSED" ? "Reason (e.g. Sick leave):" : "Note (optional):"}
                      </span>
                      <input
                        value={mark.reason}
                        onChange={e => setReason(r.studentId, r, e.target.value)}
                        placeholder={current === "EXCUSED" ? "e.g. Sick leave, Family emergency" : "Optional note"}
                        style={{
                          flex: 1, minWidth: 160, border: `1px solid ${C.border}`, borderRadius: 6,
                          padding: "5px 10px", fontSize: 12, outline: "none", background: C.white,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div style={{ fontSize: 11, color: C.slate, textAlign: "center" }}>
        Click a status button to mark each student. Changed rows are highlighted until saved.
      </div>
    </div>
  );
}
