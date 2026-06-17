import { useState, useEffect } from "react";
import { C } from "../theme";
import { api } from "../api/client";

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6,
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABELS = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday" };

// Common time slots for quick selection
const TIME_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00",
];

export default function TimetableSlotModal({ entry, sectionId, defaultDay, onClose, onDone }) {
  const isEdit = Boolean(entry);

  const [subjects, setSubjects]   = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const [creatingSubject, setCreatingSubject] = useState(false);

  const [subjectId, setSubjectId] = useState(entry?.subject?.id ? String(entry.subject.id) : "");
  const [teacherId, setTeacherId] = useState(entry?.teacher?.id ? String(entry.teacher.id) : "");
  const [day, setDay]             = useState(entry?.day || defaultDay || "MON");
  const [startTime, setStartTime] = useState(entry?.startTime || "08:00");
  const [endTime, setEndTime]     = useState(entry?.endTime || "09:00");

  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/sections/subjects"),
      api.get("/teachers"),
    ])
      .then(([subs, tchs]) => {
        setSubjects(subs);
        setTeachers(tchs);
        if (!isEdit && subs.length > 0) setSubjectId(String(subs[0].id));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAddSubject = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) { setAddingSubject(false); return; }
    setCreatingSubject(true);
    setError("");
    try {
      const created = await api.post("/sections/subjects", { name: trimmed });
      setSubjects(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSubjectId(String(created.id));
      setNewSubjectName("");
      setAddingSubject(false);
    } catch (err) {
      setError(err.message || "Failed to add subject");
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!subjectId) { setError("Please select a subject."); return; }
    if (!startTime || !endTime) { setError("Please set start and end times."); return; }
    if (startTime >= endTime) { setError("End time must be after start time."); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/timetable/${entry.id}`, {
          subjectId: Number(subjectId),
          teacherId: teacherId ? Number(teacherId) : null,
          startTime,
          endTime,
        });
      } else {
        await api.post("/timetable", {
          sectionId: Number(sectionId),
          subjectId: Number(subjectId),
          teacherId: teacherId ? Number(teacherId) : null,
          day,
          startTime,
          endTime,
        });
      }
      onDone();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, padding: 24, width: 440,
        maxWidth: "100%", maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>
            {isEdit ? "Edit Slot" : "Add Slot"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Day (add mode only) */}
          {!isEdit && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Day</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAYS.map(d => (
                  <button key={d} type="button" onClick={() => setDay(d)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${day === d ? C.accent : C.border}`,
                    background: day === d ? C.accentL : C.white,
                    color: day === d ? C.accent : C.textMid, cursor: "pointer",
                  }}>{DAY_LABELS[d]}</button>
                ))}
              </div>
            </div>
          )}

          {/* Time */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Start Time</label>
              <select value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle}>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>End Time</label>
              <select value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle}>
                {TIME_OPTIONS.filter(t => t > startTime).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Subject</label>
            {addingSubject ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  autoFocus
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddSubject(); }
                    if (e.key === "Escape") { setAddingSubject(false); setNewSubjectName(""); }
                  }}
                  placeholder="New subject name"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" onClick={handleAddSubject} disabled={creatingSubject} style={{
                  background: C.accent, color: C.white, border: "none", borderRadius: 8,
                  padding: "0 14px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>{creatingSubject ? "…" : "Add"}</button>
                <button type="button" onClick={() => { setAddingSubject(false); setNewSubjectName(""); }} style={{
                  background: "none", border: "none", color: C.slate, cursor: "pointer", fontSize: 16,
                }}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} style={{ ...inputStyle, flex: 1 }} disabled={loading}>
                  <option value="">— Select subject —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setAddingSubject(true)} style={{
                  background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
                  padding: "0 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                }}>+ Other</button>
              </div>
            )}
          </div>

          {/* Teacher */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Teacher (optional)</label>
            <select value={teacherId} onChange={e => setTeacherId(e.target.value)} style={inputStyle} disabled={loading}>
              <option value="">— No teacher assigned —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.user?.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{
              background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
              padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              background: C.accent, color: C.white, border: "none", borderRadius: 8,
              padding: "9px 20px", fontWeight: 600, fontSize: 13,
              cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Slot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
