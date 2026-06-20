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
const btnBase = {
  border: "none", borderRadius: 6, padding: "4px 10px",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};

export default function ManageClassesModal({ onClose, onChanged }) {
  const [sections, setSections]     = useState([]);
  const [gradeLevels, setGrades]    = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  // Add form
  const [gradeMode, setGradeMode]   = useState("existing");
  const [gradeId, setGradeId]       = useState("");
  const [newGradeName, setNewGradeName] = useState("");
  const [sectionName, setSectionName]   = useState("");
  const [submitting, setSubmitting]     = useState(false);

  // Inline edit state: { type: "section"|"grade", id, value }
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  const grouped = gradeLevels.map(g => ({
    grade: g,
    sections: sections.filter(s => s.gradeLevel.id === g.id),
  }));

  const notify = (msg, isError = false) => {
    if (isError) setError(msg);
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  // ── Add section ────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!sectionName.trim()) { setError("Section name is required."); return; }

    let gradeName;
    if (gradeMode === "new") {
      if (!newGradeName.trim()) { setError("Please enter a new grade level name."); return; }
      gradeName = newGradeName.trim();
    } else {
      const grade = gradeLevels.find(g => String(g.id) === gradeId);
      if (!grade) { setError("Please select a grade level."); return; }
      gradeName = grade.name;
    }

    setSubmitting(true);
    try {
      await api.post("/sections", { gradeName, sectionName: sectionName.trim() });
      notify(`Added: ${gradeName} – ${sectionName.trim()}`);
      setSectionName(""); setNewGradeName("");
      fetchData();
      if (onChanged) onChanged();
    } catch (err) {
      notify(err.message || "Failed to create section", true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete section ─────────────────────────────────────────────
  const handleDeleteSection = async (section) => {
    if (!window.confirm(`Delete section "${section.gradeLevel.name} – ${section.name}"?`)) return;
    setError("");
    try {
      await api.delete(`/sections/${section.id}`);
      fetchData();
      if (onChanged) onChanged();
    } catch (err) {
      notify(err.message || "Failed to delete section", true);
    }
  };

  // ── Delete grade level ─────────────────────────────────────────
  const handleDeleteGrade = async (grade, sectionCount) => {
    if (sectionCount > 0) { notify("Remove all sections from this grade first.", true); return; }
    if (!window.confirm(`Delete grade level "${grade.name}"?`)) return;
    setError("");
    try {
      await api.delete(`/sections/grade-levels/${grade.id}`);
      fetchData();
      if (onChanged) onChanged();
    } catch (err) {
      notify(err.message || "Failed to delete grade level", true);
    }
  };

  // ── Start inline edit ──────────────────────────────────────────
  const startEdit = (type, id, currentValue) => {
    setEditing({ type, id });
    setEditValue(currentValue);
    setError("");
  };

  const cancelEdit = () => { setEditing(null); setEditValue(""); };

  // ── Save inline edit ───────────────────────────────────────────
  const saveEdit = async () => {
    if (!editValue.trim()) { notify("Name cannot be empty.", true); return; }
    setEditSaving(true);
    try {
      if (editing.type === "section") {
        await api.put(`/sections/${editing.id}`, { name: editValue.trim() });
      } else {
        await api.put(`/sections/grade-levels/${editing.id}`, { name: editValue.trim() });
      }
      notify("Renamed successfully.");
      setEditing(null);
      fetchData();
      if (onChanged) onChanged();
    } catch (err) {
      notify(err.message || "Failed to rename", true);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, width: 540, maxWidth: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>Manage Classes</h2>
            <p style={{ fontSize: 12, color: C.slate, margin: "3px 0 0" }}>Add, rename, or delete grade levels and sections</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          {/* Messages */}
          {error && <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{error}</div>}
          {success && <div style={{ background: C.greenL, color: C.green, fontSize: 12, fontWeight: 600, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>✓ {success}</div>}

          {/* ── Add form ── */}
          <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Add New Section
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Grade Level</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {[["existing", "Existing Grade"], ["new", "New Grade"]].map(([m, lbl]) => (
                  <button key={m} type="button" onClick={() => setGradeMode(m)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${gradeMode === m ? C.accent : C.border}`,
                    background: gradeMode === m ? C.accentL : C.white,
                    color: gradeMode === m ? C.accent : C.textMid, cursor: "pointer",
                  }}>{lbl}</button>
                ))}
              </div>
              {gradeMode === "existing" ? (
                <select value={gradeId} onChange={e => setGradeId(e.target.value)} style={inputStyle} disabled={loading || gradeLevels.length === 0}>
                  {gradeLevels.length === 0 && <option value="">No grade levels yet — use "New Grade"</option>}
                  {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <input value={newGradeName} onChange={e => setNewGradeName(e.target.value)} placeholder='e.g. "Grade 12" or "KG1"' style={inputStyle} />
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Section Name</label>
              <input value={sectionName} onChange={e => setSectionName(e.target.value)} placeholder="e.g. A, B, C, or Blue…" style={inputStyle} />
            </div>

            <button type="submit" disabled={submitting} style={{
              background: C.accent, color: C.white, border: "none", borderRadius: 8,
              padding: "9px 20px", fontWeight: 600, fontSize: 13,
              cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? "Adding…" : "+ Add Section"}
            </button>
          </form>

          {/* ── Existing classes ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            Existing Classes
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: C.slate }}>Loading…</div>
          ) : grouped.length === 0 ? (
            <div style={{ fontSize: 13, color: C.slate }}>No classes yet — add one above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {grouped.filter(g => g.sections.length > 0 || true).map(g => (
                <div key={g.grade.id} style={{ background: C.slateL, borderRadius: 10, padding: "12px 14px" }}>
                  {/* Grade level row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    {editing?.type === "grade" && editing.id === g.grade.id ? (
                      <>
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                          style={{ ...inputStyle, flex: 1, padding: "5px 10px", fontSize: 13 }}
                        />
                        <button onClick={saveEdit} disabled={editSaving} style={{ ...btnBase, background: C.green, color: C.white }}>
                          {editSaving ? "…" : "Save"}
                        </button>
                        <button onClick={cancelEdit} style={{ ...btnBase, background: C.slateL, color: C.textMid }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 700, fontSize: 14, color: C.text, flex: 1 }}>{g.grade.name}</span>
                        <button onClick={() => startEdit("grade", g.grade.id, g.grade.name)} style={{ ...btnBase, background: C.accentL, color: C.accent }}>
                          ✏️ Rename
                        </button>
                        {g.sections.length === 0 && (
                          <button onClick={() => handleDeleteGrade(g.grade, g.sections.length)} style={{ ...btnBase, background: C.redL, color: C.red }}>
                            🗑️ Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Sections */}
                  {g.sections.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.slate }}>No sections — add one above or delete this grade.</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {g.sections.map(s => (
                        <div key={s.id} style={{ background: C.white, borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                          {editing?.type === "section" && editing.id === s.id ? (
                            <>
                              <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                style={{ width: 80, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 12, outline: "none" }}
                              />
                              <button onClick={saveEdit} disabled={editSaving} style={{ ...btnBase, background: C.green, color: C.white, padding: "3px 8px" }}>
                                {editSaving ? "…" : "✓"}
                              </button>
                              <button onClick={cancelEdit} style={{ ...btnBase, background: "none", color: C.slate, padding: "3px 6px" }}>✕</button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>Section {s.name}</span>
                              <span style={{ fontSize: 11, color: C.slate }}>
                                {s._count?.students || 0} student{s._count?.students !== 1 ? "s" : ""}
                              </span>
                              <button onClick={() => startEdit("section", s.id, s.name)} style={{ ...btnBase, background: "none", color: C.accent, padding: "2px 6px", fontSize: 11 }}>
                                ✏️
                              </button>
                              {(!s._count || s._count.students === 0) && (
                                <button onClick={() => handleDeleteSection(s)} style={{ ...btnBase, background: "none", color: C.red, padding: "2px 6px", fontSize: 11 }}>
                                  🗑️
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
