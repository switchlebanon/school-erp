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

export default function ManageClassesModal({ onClose, onChanged }) {
  const [sections, setSections]   = useState([]);
  const [gradeLevels, setGrades]  = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // Add form
  const [gradeMode, setGradeMode] = useState("existing"); // "existing" | "new"
  const [gradeId, setGradeId]     = useState("");
  const [newGradeName, setNewGradeName] = useState("");
  const [sectionName, setSectionName]   = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.get("/sections"), api.get("/sections/grade-levels")])
      .then(([secs, grades]) => {
        setSections(secs);
        setGrades(grades);
        if (grades.length > 0 && !gradeId) setGradeId(String(grades[0].id));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // Group sections by grade for display
  const grouped = gradeLevels.map(g => ({
    grade: g,
    sections: sections.filter(s => s.gradeLevel.id === g.id),
  }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!sectionName.trim()) { setError("Section name is required (e.g. A, B, C)."); return; }

    let gradeName;
    if (gradeMode === "new") {
      if (!newGradeName.trim()) { setError("Please enter a name for the new grade level."); return; }
      gradeName = newGradeName.trim();
    } else {
      const grade = gradeLevels.find(g => String(g.id) === gradeId);
      if (!grade) { setError("Please select a grade level."); return; }
      gradeName = grade.name;
    }

    setSubmitting(true);
    try {
      await api.post("/sections", {
        gradeName,
        sectionName: sectionName.trim(),
      });
      setSuccess(`Added: ${gradeName} – ${sectionName.trim()}`);
      setSectionName("");
      setNewGradeName("");
      fetchData();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message || "Failed to create section");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (section) => {
    if (section._count?.students > 0) return; // shouldn't happen, button disabled
    if (!window.confirm(`Delete "${section.gradeLevel.name} – ${section.name}"?`)) return;

    setError("");
    try {
      await api.delete(`/sections/${section.id}`);
      fetchData();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message || "Failed to delete section");
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, width: 520, maxWidth: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>Manage Classes</h2>
            <p style={{ fontSize: 12, color: C.slate, margin: "3px 0 0" }}>Grade levels & sections</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        <div style={{ padding: "18px 22px" }}>

          {/* ── Add form ── */}
          <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Add New Section
            </div>

            {/* Grade selection */}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Grade Level</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button type="button" onClick={() => setGradeMode("existing")} style={{
                  flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${gradeMode === "existing" ? C.accent : C.border}`,
                  background: gradeMode === "existing" ? C.accentL : C.white,
                  color: gradeMode === "existing" ? C.accent : C.textMid, cursor: "pointer",
                }}>Existing Grade</button>
                <button type="button" onClick={() => setGradeMode("new")} style={{
                  flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${gradeMode === "new" ? C.accent : C.border}`,
                  background: gradeMode === "new" ? C.accentL : C.white,
                  color: gradeMode === "new" ? C.accent : C.textMid, cursor: "pointer",
                }}>New Grade</button>
              </div>

              {gradeMode === "existing" ? (
                <select value={gradeId} onChange={e => setGradeId(e.target.value)} style={inputStyle} disabled={loading || gradeLevels.length === 0}>
                  {gradeLevels.length === 0 && <option value="">No grade levels yet — use "New Grade"</option>}
                  {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <input
                  value={newGradeName}
                  onChange={e => setNewGradeName(e.target.value)}
                  placeholder='e.g. "Grade 13" or "KG1"'
                  style={inputStyle}
                />
              )}
            </div>

            {/* Section name */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Section Name</label>
              <input
                value={sectionName}
                onChange={e => setSectionName(e.target.value)}
                placeholder="e.g. A, B, C, or Blue, Red…"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: C.greenL, color: C.green, fontSize: 12, fontWeight: 600, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
                ✓ {success}
              </div>
            )}

            <button type="submit" disabled={submitting} style={{
              background: C.accent, color: C.white, border: "none", borderRadius: 8,
              padding: "9px 20px", fontWeight: 600, fontSize: 13,
              cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? "Adding…" : "+ Add Section"}
            </button>
          </form>

          {/* ── Existing classes list ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            Existing Classes
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: C.slate, padding: "12px 0" }}>Loading…</div>
          ) : grouped.every(g => g.sections.length === 0) ? (
            <div style={{ fontSize: 13, color: C.slate, padding: "12px 0" }}>No sections yet — add one above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grouped.filter(g => g.sections.length > 0).map(g => (
                <div key={g.grade.id}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>{g.grade.name}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {g.sections.map(s => (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: C.slateL, borderRadius: 8, padding: "6px 10px",
                        fontSize: 12,
                      }}>
                        <span style={{ fontWeight: 600, color: C.text }}>Section {s.name}</span>
                        <span style={{ color: C.slate, fontSize: 11 }}>
                          ({s._count?.students || 0} student{s._count?.students !== 1 ? "s" : ""})
                        </span>
                        {(!s._count || s._count.students === 0) && (
                          <button
                            onClick={() => handleDelete(s)}
                            title="Delete section"
                            style={{ background: "none", border: "none", color: C.slate, cursor: "pointer", fontSize: 12, padding: 0, marginLeft: 2 }}
                          >🗑️</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
