import { useState, useEffect, useRef } from "react";
import { C } from "../theme";
import { Card } from "../components/Shared";
import { api } from "../api/client";
import AddStudentModal from "./AddStudentModal";

const MAX_PER_CLASS = 25;

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box",
};
const btnStyle = (color, bg) => ({
  background: bg, color, border: "none", borderRadius: 6,
  padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
});

function capacityColor(count) {
  if (count > MAX_PER_CLASS) return C.red;
  if ((count / MAX_PER_CLASS) >= 0.9) return C.amber;
  if ((count / MAX_PER_CLASS) >= 0.7) return C.accent;
  return C.green;
}
function capacityBg(count) {
  if (count > MAX_PER_CLASS) return C.redL;
  if ((count / MAX_PER_CLASS) >= 0.9) return C.amberL;
  if ((count / MAX_PER_CLASS) >= 0.7) return C.accentL;
  return C.greenL;
}

// ── Small reusable modal wrapper ──────────────────────────────────
function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, padding: 24, width,
        maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Classes() {
  const [sections, setSections]     = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // Drill-down
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [search, setSearch]         = useState("");

  // Modals
  const [modal, setModal] = useState(null);
  // modal types: "add-grade", "edit-grade", "add-section", "edit-section", "move-student", "confirm-delete"

  const closeModal = () => setModal(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get("/sections"),
      api.get("/sections/grade-levels"),
      api.get("/students"),
    ])
      .then(([secs, grades, studs]) => {
        setSections(secs);
        setGradeLevels(grades);
        setStudents(Array.isArray(studs) ? studs : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Derived data ──────────────────────────────────────────────
  const gradeMap = {};
  gradeLevels.forEach(g => { gradeMap[g.id] = { grade: g, sections: [] }; });
  sections.forEach(sec => {
    if (gradeMap[sec.gradeLevel.id]) gradeMap[sec.gradeLevel.id].sections.push(sec);
  });
  const grades = Object.values(gradeMap).sort((a, b) => (a.grade.order || 0) - (b.grade.order || 0));

  const studentsBySection = students.reduce((acc, s) => {
    if (!acc[s.sectionId]) acc[s.sectionId] = [];
    acc[s.sectionId].push(s);
    return acc;
  }, {});

  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const sectionStudents = selectedSectionId ? (studentsBySection[selectedSectionId] || []) : [];
  const filteredStudents = sectionStudents.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.studentCode?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Actions ───────────────────────────────────────────────────

  const handleAddGrade = async (name, order) => {
    await api.post("/sections", { gradeName: name, sectionName: "A" });
    fetchAll();
    closeModal();
  };

  const handleRenameGrade = async (id, name) => {
    await api.put(`/sections/grade-levels/${id}`, { name });
    fetchAll();
    closeModal();
  };

  const handleDeleteGrade = async (id) => {
    await api.delete(`/sections/grade-levels/${id}`);
    fetchAll();
    closeModal();
  };

  const handleMoveGrade = async (gradeId, direction) => {
    const currentOrder = grades.map(g => g.grade);
    const idx = currentOrder.findIndex(g => g.id === gradeId);
    if (idx === -1) return;
    if (direction === "up"   && idx === 0) return;
    if (direction === "down" && idx === currentOrder.length - 1) return;

    const newOrder = [...currentOrder];
    const swapIdx  = direction === "up" ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

    await api.post("/sections/grade-levels/reorder", { ids: newOrder.map(g => g.id) });
    fetchAll();
  };

  const handleAddSection = async (gradeName, sectionName) => {
    await api.post("/sections", { gradeName, sectionName });
    fetchAll();
    closeModal();
  };

  const handleRenameSection = async (id, name) => {
    await api.put(`/sections/${id}`, { name });
    fetchAll();
    closeModal();
  };

  const handleDeleteSection = async (id) => {
    await api.delete(`/sections/${id}`);
    fetchAll();
    closeModal();
    setSelectedSectionId(null);
  };

  const handleMoveStudent = async (studentId, newSectionId) => {
    await api.put(`/students/${studentId}`, { sectionId: newSectionId });
    fetchAll();
    closeModal();
  };

  // ── Section detail view ────────────────────────────────────────
  if (selectedSectionId && selectedSection) {
    const count = sectionStudents.length;
    const color = capacityColor(count);
    const pct   = Math.min(100, Math.round((count / MAX_PER_CLASS) * 100));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setSelectedSectionId(null); setSearch(""); }} style={btnStyle(C.textMid, C.slateL)}>
              ← Back
            </button>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>
                {selectedSection.gradeLevel.name} — Section {selectedSection.name}
              </h2>
              <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>
                {count} of {MAX_PER_CLASS} students
                {count > MAX_PER_CLASS && <span style={{ color: C.red, fontWeight: 700 }}> · {count - MAX_PER_CLASS} over capacity!</span>}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setModal({ type: "add-student" })}
              style={btnStyle(C.white, C.accent)}
            >
              + Add Student
            </button>
            <button onClick={() => setModal({ type: "edit-section", section: selectedSection })} style={btnStyle(C.accent, C.accentL)}>
              ✏️ Rename Section
            </button>
            {count === 0 && (
              <button onClick={() => setModal({ type: "confirm-delete", id: selectedSectionId, label: `Section ${selectedSection.name}`, onConfirm: () => handleDeleteSection(selectedSectionId) })} style={btnStyle(C.red, C.redL)}>
                🗑️ Delete Section
              </button>
            )}
          </div>
        </div>

        {/* Capacity bar */}
        <Card style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMid, marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>Class Capacity</span>
            <span style={{ fontWeight: 700, color }}>{count} / {MAX_PER_CLASS}</span>
          </div>
          <div style={{ background: C.slateL, borderRadius: 6, height: 10, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: color, transition: "width 0.4s" }} />
          </div>
          {count > MAX_PER_CLASS && (
            <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginTop: 8 }}>
              ⚠️ Over capacity by {count - MAX_PER_CLASS} student{count - MAX_PER_CLASS !== 1 ? "s" : ""}. Consider moving some students to another section.
            </div>
          )}
        </Card>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students…"
            style={{ ...inputStyle, flex: 1, maxWidth: 300 }}
          />
        </div>

        {/* Student table */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Students ({filteredStudents.length})</span>
          </div>
          {filteredStudents.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: C.slate, fontSize: 13 }}>
              {sectionStudents.length === 0 ? "No students enrolled in this section yet." : "No students match your search."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.slateL, borderBottom: `2px solid ${C.border}` }}>
                    {["#", "Student ID", "Name", "Guardian", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: C.slate, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : C.slateL + "50" }}>
                      <td style={{ padding: "10px 14px", color: C.slate, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: C.accent, fontWeight: 700 }}>{s.studentCode}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text }}>{s.name}</td>
                      <td style={{ padding: "10px 14px", color: C.textMid, fontSize: 12 }}>{s.guardianName || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                          background: s.status === "ACTIVE" ? C.greenL : C.amberL,
                          color: s.status === "ACTIVE" ? C.green : C.amber,
                        }}>{s.status}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          onClick={() => setModal({ type: "move-student", student: s })}
                          style={btnStyle(C.accent, C.accentL)}
                        >
                          ↔ Move
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modals */}
        {modal?.type === "add-student" && (
          <AddStudentModal
            defaultSectionId={selectedSectionId}
            onClose={closeModal}
            onDone={() => { closeModal(); fetchAll(); }}
          />
        )}
        {modal?.type === "edit-section" && (
          <EditNameModal
            title={`Rename Section "${modal.section.name}"`}
            defaultValue={modal.section.name}
            label="Section Name"
            onClose={closeModal}
            onSave={name => handleRenameSection(modal.section.id, name)}
          />
        )}
        {modal?.type === "confirm-delete" && (
          <ConfirmDeleteModal
            label={modal.label}
            onClose={closeModal}
            onConfirm={modal.onConfirm}
          />
        )}
        {modal?.type === "move-student" && (
          <MoveStudentModal
            student={modal.student}
            sections={sections}
            currentSectionId={selectedSectionId}
            onClose={closeModal}
            onMove={handleMoveStudent}
          />
        )}
      </div>
    );
  }

  // ── Overview ─────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Classes</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>
            {students.length} students · {sections.length} sections · {gradeLevels.length} grade levels · Max {MAX_PER_CLASS}/class
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setModal({ type: "add-section" })} style={btnStyle(C.accent, C.accentL)}>
            + Add Section
          </button>
          <button onClick={() => setModal({ type: "add-grade" })} style={btnStyle(C.green, C.greenL)}>
            + Add Grade Level
          </button>
        </div>
      </div>

      {error && <Card style={{ borderColor: C.red, background: C.redL }}><div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div></Card>}

      {/* Capacity legend */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[[C.green, "Available"], [C.accent, "Filling (70%+)"], [C.amber, "Almost full (90%+)"], [C.red, "Over capacity"]].map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textMid }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
          </div>
        ))}
      </div>

      {loading ? (
        <Card><div style={{ padding: 24, textAlign: "center", color: C.slate }}>Loading…</div></Card>
      ) : grades.length === 0 ? (
        <Card><div style={{ padding: 24, textAlign: "center", color: C.slate }}>No classes yet. Click "+ Add Grade Level" to start.</div></Card>
      ) : (
        grades.map(({ grade, sections: gradeSections }) => {
          const gradeTotal = gradeSections.reduce((sum, sec) => sum + (studentsBySection[sec.id]?.length || 0), 0);
          return (
            <div key={grade.id}>
              {/* Grade header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{grade.name}</div>
                <div style={{ fontSize: 12, color: C.slate, background: C.slateL, padding: "2px 10px", borderRadius: 20 }}>
                  {gradeTotal} students · {gradeSections.length} section{gradeSections.length !== 1 ? "s" : ""}
                </div>
                {/* Reorder buttons */}
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    onClick={() => handleMoveGrade(grade.id, "up")}
                    disabled={grades.indexOf(grades.find(g => g.grade.id === grade.id)) === 0}
                    title="Move up"
                    style={{
                      background: C.slateL, border: "none", borderRadius: 6,
                      padding: "3px 8px", cursor: "pointer", fontSize: 12, color: C.textMid,
                      opacity: grades.indexOf(grades.find(g => g.grade.id === grade.id)) === 0 ? 0.3 : 1,
                    }}
                  >↑</button>
                  <button
                    onClick={() => handleMoveGrade(grade.id, "down")}
                    disabled={grades.indexOf(grades.find(g => g.grade.id === grade.id)) === grades.length - 1}
                    title="Move down"
                    style={{
                      background: C.slateL, border: "none", borderRadius: 6,
                      padding: "3px 8px", cursor: "pointer", fontSize: 12, color: C.textMid,
                      opacity: grades.indexOf(grades.find(g => g.grade.id === grade.id)) === grades.length - 1 ? 0.3 : 1,
                    }}
                  >↓</button>
                </div>
                <button
                  onClick={() => setModal({ type: "edit-grade", grade })}
                  style={{ ...btnStyle(C.accent, C.accentL), fontSize: 11, padding: "3px 9px" }}
                >✏️ Rename</button>
                <button
                  onClick={() => setModal({ type: "add-section", gradeName: grade.name })}
                  style={{ ...btnStyle(C.green, C.greenL), fontSize: 11, padding: "3px 9px" }}
                >+ Section</button>
                {gradeSections.length === 0 && (
                  <button
                    onClick={() => setModal({ type: "confirm-delete", id: grade.id, label: `Grade Level "${grade.name}"`, onConfirm: () => handleDeleteGrade(grade.id) })}
                    style={{ ...btnStyle(C.red, C.redL), fontSize: 11, padding: "3px 9px" }}
                  >🗑️ Delete</button>
                )}
              </div>

              {/* Section cards */}
              {gradeSections.length === 0 ? (
                <div style={{ fontSize: 13, color: C.slate, padding: "8px 0 4px" }}>No sections yet — click "+ Section" to add one.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {gradeSections.map(sec => {
                    const count = (studentsBySection[sec.id] || []).length;
                    const color = capacityColor(count);
                    const bg    = capacityBg(count);
                    const pct   = Math.min(100, Math.round((count / MAX_PER_CLASS) * 100));
                    return (
                      <div key={sec.id} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                        {/* Section name + actions */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div
                            onClick={() => setSelectedSectionId(sec.id)}
                            style={{ cursor: "pointer" }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Section {sec.name}</div>
                            <div style={{ fontSize: 11, color: C.slate }}>Click to view students</div>
                          </div>
                          <div style={{ display: "flex", gap: 4, flexDirection: "column", alignItems: "flex-end" }}>
                            <div style={{ background: bg, color, borderRadius: 8, padding: "4px 10px", fontWeight: 800, fontSize: 18 }}>{count}</div>
                          </div>
                        </div>
                        {/* Capacity bar */}
                        <div style={{ background: C.slateL, borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 6 }}>
                          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.slate, marginBottom: 10 }}>
                          <span>{count}/{MAX_PER_CLASS}</span>
                          <span style={{ fontWeight: 600, color }}>{count > MAX_PER_CLASS ? "Over!" : `${MAX_PER_CLASS - count} left`}</span>
                        </div>
                        {/* Section actions */}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => setModal({ type: "edit-section", section: sec })}
                            style={{ ...btnStyle(C.accent, C.accentL), flex: 1, fontSize: 11, padding: "5px 0" }}
                          >✏️ Rename</button>
                          {count === 0 && (
                            <button
                              onClick={() => setModal({ type: "confirm-delete", id: sec.id, label: `Section ${sec.name}`, onConfirm: () => handleDeleteSection(sec.id) })}
                              style={{ ...btnStyle(C.red, C.redL), flex: 1, fontSize: 11, padding: "5px 0" }}
                            >🗑️ Delete</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modals */}
      {modal?.type === "add-grade" && (
        <AddGradeModal
          onClose={closeModal}
          onSave={handleAddGrade}
        />
      )}
      {modal?.type === "edit-grade" && (
        <EditNameModal
          title={`Rename "${modal.grade.name}"`}
          defaultValue={modal.grade.name}
          label="Grade Level Name"
          onClose={closeModal}
          onSave={name => handleRenameGrade(modal.grade.id, name)}
        />
      )}
      {modal?.type === "add-section" && (
        <AddSectionModal
          gradeLevels={gradeLevels}
          defaultGradeName={modal.gradeName}
          onClose={closeModal}
          onSave={handleAddSection}
        />
      )}
      {modal?.type === "edit-section" && (
        <EditNameModal
          title={`Rename Section "${modal.section.name}"`}
          defaultValue={modal.section.name}
          label="Section Name"
          onClose={closeModal}
          onSave={name => handleRenameSection(modal.section.id, name)}
        />
      )}
      {modal?.type === "confirm-delete" && (
        <ConfirmDeleteModal
          label={modal.label}
          onClose={closeModal}
          onConfirm={modal.onConfirm}
        />
      )}
    </div>
  );
}

// ── Sub-modals ────────────────────────────────────────────────────

function AddGradeModal({ onClose, onSave }) {
  const [name, setName]     = useState("");
  const [section, setSection] = useState("A");
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Grade level name is required."); return; }
    if (!section.trim()) { setError("At least one section name is required."); return; }
    setSaving(true);
    try {
      await onSave(name.trim(), section.trim());
    } catch (err) {
      setError(err.message || "Failed to add grade level");
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Grade Level" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Grade Level Name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder='e.g. "Grade 7" or "KG1"' style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>First Section Name</label>
          <input value={section} onChange={e => setSection(e.target.value)} placeholder='e.g. "A"' style={inputStyle} />
          <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>You can add more sections after creating the grade.</div>
        </div>
        {error && <div style={{ background: C.redL, color: C.red, fontSize: 12, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnStyle(C.textMid, C.slateL)}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...btnStyle(C.white, C.accent), padding: "9px 20px", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Adding…" : "Add Grade Level"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddSectionModal({ gradeLevels, defaultGradeName, onClose, onSave }) {
  const [gradeName, setGradeName] = useState(defaultGradeName || (gradeLevels[0]?.name || ""));
  const [sectionName, setSectionName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gradeName.trim()) { setError("Please select a grade level."); return; }
    if (!sectionName.trim()) { setError("Section name is required."); return; }
    setSaving(true);
    try {
      await onSave(gradeName.trim(), sectionName.trim());
    } catch (err) {
      setError(err.message || "Failed to add section");
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Section" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Grade Level</label>
          <select value={gradeName} onChange={e => setGradeName(e.target.value)} style={inputStyle}>
            {gradeLevels.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Section Name</label>
          <input autoFocus value={sectionName} onChange={e => setSectionName(e.target.value)} placeholder='e.g. "B", "C", or "Blue"' style={inputStyle} />
        </div>
        {error && <div style={{ background: C.redL, color: C.red, fontSize: 12, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnStyle(C.textMid, C.slateL)}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...btnStyle(C.white, C.accent), padding: "9px 20px", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Adding…" : "Add Section"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditNameModal({ title, defaultValue, label, onClose, onSave }) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) { setError(`${label} is required.`); return; }
    setSaving(true);
    try {
      await onSave(value.trim());
    } catch (err) {
      setError(err.message || "Failed to save");
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} width={380}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>{label}</label>
          <input autoFocus value={value} onChange={e => setValue(e.target.value)} style={inputStyle} />
        </div>
        {error && <div style={{ background: C.redL, color: C.red, fontSize: 12, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnStyle(C.textMid, C.slateL)}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...btnStyle(C.white, C.green), padding: "9px 20px", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDeleteModal({ label, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || "Failed to delete");
      setDeleting(false);
    }
  };

  return (
    <Modal title="Confirm Delete" onClose={onClose} width={380}>
      <div style={{ fontSize: 14, color: C.text, marginBottom: 8 }}>
        Are you sure you want to delete <b>{label}</b>?
      </div>
      <div style={{ fontSize: 12, color: C.slate, marginBottom: 20 }}>This action cannot be undone.</div>
      {error && <div style={{ background: C.redL, color: C.red, fontSize: 12, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnStyle(C.textMid, C.slateL)}>Cancel</button>
        <button onClick={handleConfirm} disabled={deleting} style={{ ...btnStyle(C.white, C.red), padding: "9px 20px", opacity: deleting ? 0.7 : 1 }}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

function MoveStudentModal({ student, sections, currentSectionId, onClose, onMove }) {
  const [targetSectionId, setTargetSectionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const available = sections.filter(s => s.id !== currentSectionId);

  const handleMove = async () => {
    if (!targetSectionId) { setError("Please select a destination class."); return; }
    setSaving(true);
    try {
      await onMove(student.id, Number(targetSectionId));
    } catch (err) {
      setError(err.message || "Failed to move student");
      setSaving(false);
    }
  };

  return (
    <Modal title={`Move ${student.name}`} onClose={onClose} width={400}>
      <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>
        Currently in: <b>{student.section?.gradeLevel?.name} — Section {student.section?.name}</b>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Move to</label>
        <select value={targetSectionId} onChange={e => setTargetSectionId(e.target.value)} style={inputStyle}>
          <option value="">— Select a class —</option>
          {available.map(s => (
            <option key={s.id} value={s.id}>{s.gradeLevel.name} — Section {s.name}</option>
          ))}
        </select>
      </div>
      {error && <div style={{ background: C.redL, color: C.red, fontSize: 12, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnStyle(C.textMid, C.slateL)}>Cancel</button>
        <button onClick={handleMove} disabled={saving || !targetSectionId} style={{ ...btnStyle(C.white, C.accent), padding: "9px 20px", opacity: saving || !targetSectionId ? 0.7 : 1 }}>
          {saving ? "Moving…" : "Move Student"}
        </button>
      </div>
    </Modal>
  );
}
