import { useState, useEffect, useMemo } from "react";
import { C } from "../theme";
import { api } from "../api/client";

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6,
};

export default function NewInvoiceModal({ onClose, onDone }) {
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId]     = useState("");

  const [description, setDescription] = useState("Term Tuition");
  const [amount, setAmount]           = useState("1800");
  const [dueDate, setDueDate]         = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/students")
      .then(data => {
        setAllStudents(data);
        if (data.length > 0) setStudentId(String(data[0].id));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudents;
    const q = studentSearch.toLowerCase();
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.studentCode?.toLowerCase().includes(q) ||
      s.section?.gradeLevel?.name?.toLowerCase().includes(q)
    );
  }, [allStudents, studentSearch]);

  const selectedStudent = allStudents.find(s => String(s.id) === String(studentId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!studentId || !description || !amount || !dueDate) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/fees", {
        studentId: Number(studentId),
        description: description.trim(),
        amount: Number(amount),
        dueDate,
      });
      onDone();
    } catch (err) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, padding: 24, width: 460,
        maxWidth: "100%", boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>New Invoice</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Student search ── */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Student</label>

            {/* Search box */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.slate, pointerEvents: "none" }}>🔍</span>
              <input
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search by name, code or grade…"
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>

            {/* Student list */}
            <div style={{
              border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 180,
              overflowY: "auto", background: C.white,
            }}>
              {loadingStudents && (
                <div style={{ padding: "10px 12px", fontSize: 13, color: C.slate }}>Loading students…</div>
              )}
              {!loadingStudents && filteredStudents.length === 0 && (
                <div style={{ padding: "10px 12px", fontSize: 13, color: C.slate }}>No students found.</div>
              )}
              {filteredStudents.map(s => {
                const isSelected = String(s.id) === String(studentId);
                return (
                  <div
                    key={s.id}
                    onClick={() => setStudentId(String(s.id))}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", cursor: "pointer",
                      background: isSelected ? C.accentL : "transparent",
                      borderBottom: `1px solid ${C.border}`,
                      transition: "background 0.1s",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: isSelected ? C.accent : C.slateL,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 12,
                      color: isSelected ? C.white : C.slate,
                    }}>
                      {s.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: isSelected ? 700 : 500, fontSize: 13, color: isSelected ? C.accent : C.text }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.slate }}>
                        {s.section?.gradeLevel?.name} – {s.section?.name} · {s.studentCode}
                      </div>
                    </div>
                    {isSelected && <span style={{ color: C.accent, fontSize: 14 }}>✓</span>}
                  </div>
                );
              })}
            </div>

            {/* Selected student pill */}
            {selectedStudent && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
                <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                  Selected: {selectedStudent.name}
                </span>
              </div>
            )}
          </div>

          {/* ── Description ── */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Term 3 Tuition"
              style={inputStyle}
            />
          </div>

          {/* ── Amount + Due Date ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Total Amount ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
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
            <button type="submit" disabled={saving || !studentId} style={{
              background: C.accent, color: C.white, border: "none", borderRadius: 8,
              padding: "9px 18px", fontWeight: 600, fontSize: 13,
              cursor: (saving || !studentId) ? "default" : "pointer",
              opacity: (saving || !studentId) ? 0.7 : 1,
            }}>
              {saving ? "Creating…" : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
