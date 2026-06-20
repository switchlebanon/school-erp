import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { C } from "../theme";
import { Card, SectionTitle, Badge } from "../components/Shared";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const selectStyle = {
  border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px",
  fontSize: 13, outline: "none", background: C.white,
};

const scoreColor = (pct) => {
  if (pct === null) return C.slate;
  if (pct >= 85) return C.green;
  if (pct >= 75) return C.accent;
  if (pct >= 65) return C.amber;
  return C.red;
};

export default function Grades() {
  const { user } = useAuth();
  if (user?.role === "PARENT" || user?.role === "EMPLOYEE") return <ParentGrades />;
  return <TeacherGrades />;
}

// ── Parent/Employee view — read-only grades for their children ────
function ParentGrades() {
  const [children, setChildren]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [grades, setGrades]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);

  useEffect(() => {
    api.get("/students")
      .then(kids => {
        const list = Array.isArray(kids) ? kids : [];
        setChildren(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingGrades(true);
    api.get(`/grades/student/${selected.id}`)
      .then(data => setGrades(Array.isArray(data) ? data : []))
      .catch(() => setGrades([]))
      .finally(() => setLoadingGrades(false));
  }, [selected]);

  // Group grades by term
  const byTerm = grades.reduce((acc, g) => {
    if (!acc[g.term]) acc[g.term] = [];
    acc[g.term].push(g);
    return acc;
  }, {});

  if (loading) return <Card><div style={{ padding: 32, textAlign: "center", color: C.slate }}>Loading…</div></Card>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Grades</h2>
        <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>View your children's academic performance</p>
      </div>

      {children.length === 0 ? (
        <Card><div style={{ padding: 24, textAlign: "center", color: C.slate }}>No children linked to your account.</div></Card>
      ) : (
        <>
          {children.length > 1 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {children.map(c => (
                <button key={c.id} onClick={() => setSelected(c)} style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${selected?.id === c.id ? C.accent : C.border}`,
                  background: selected?.id === c.id ? C.accentL : C.white,
                  color: selected?.id === c.id ? C.accent : C.textMid, cursor: "pointer",
                }}>{c.name}</button>
              ))}
            </div>
          )}

          {loadingGrades ? (
            <Card><div style={{ padding: 24, textAlign: "center", color: C.slate }}>Loading grades…</div></Card>
          ) : grades.length === 0 ? (
            <Card><div style={{ padding: 24, textAlign: "center", color: C.slate }}>No grades recorded yet for {selected?.name}.</div></Card>
          ) : (
            Object.entries(byTerm).map(([term, termGrades]) => (
              <Card key={term}>
                <SectionTitle>{term}</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {termGrades.map(g => {
                    const pct = g.maxScore ? (Number(g.score) / Number(g.maxScore)) * 100 : null;
                    const letter = pct === null ? "—" : pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
                    return (
                      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: C.slateL, borderRadius: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{g.subject || g.subjectName}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: scoreColor(pct) }}>
                            {g.score !== null ? Number(g.score) : "—"}<span style={{ fontSize: 11, fontWeight: 400, color: C.slate }}>/{g.maxScore}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.slate }}>{pct !== null ? pct.toFixed(1) + "%" : ""}</div>
                        </div>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, background: scoreColor(pct),
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: C.white, fontWeight: 800, fontSize: 14,
                        }}>{letter}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}

// ── Teacher/Admin view ────────────────────────────────────────────
function TeacherGrades() {
  // Filters
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms]       = useState([]);
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [term, setTerm]           = useState("");

  // Data
  const [rows, setRows]       = useState([]); // [{ studentId, name, score, maxScore, ... }]
  const [editedRows, setEditedRows] = useState({}); // studentId -> { score, maxScore }
  const [classSummary, setClassSummary] = useState([]);

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingGrades, setLoadingGrades]   = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState("");
  const [saveMessage, setSaveMessage]       = useState("");

  // ── Load filter options ──────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get("/sections"),
      api.get("/sections/subjects"),
      api.get("/grades/terms"),
    ])
      .then(([secs, subs, trms]) => {
        setSections(secs);
        setSubjects(subs);
        setTerms(trms);
        if (secs.length > 0) setSectionId(String(secs[0].id));
        if (subs.length > 0) setSubjectId(String(subs[0].id));
        if (trms.length > 0) setTerm(trms[0]);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingFilters(false));
  }, []);

  // ── Load grades when filters change ──────────────────────────
  const fetchGrades = () => {
    if (!sectionId || !subjectId || !term) return;
    setLoadingGrades(true);
    setError("");
    setSaveMessage("");
    Promise.all([
      api.get(`/grades?sectionId=${sectionId}&subjectId=${subjectId}&term=${encodeURIComponent(term)}`),
      api.get(`/grades/class-summary?sectionId=${sectionId}&term=${encodeURIComponent(term)}`),
    ])
      .then(([gradeRows, summary]) => {
        setRows(gradeRows);
        setEditedRows({});
        setClassSummary(summary);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingGrades(false));
  };

  useEffect(() => { fetchGrades(); }, [sectionId, subjectId, term]);

  // ── Editing ───────────────────────────────────────────────────
  const getValue = (row, field) => {
    const edited = editedRows[row.studentId];
    if (edited && edited[field] !== undefined) return edited[field];
    return row[field];
  };

  const updateCell = (studentId, field, value) => {
    setEditedRows(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const hasChanges = Object.keys(editedRows).length > 0;

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaveMessage("");
    try {
      const grades = rows.map(row => {
        const score    = getValue(row, "score");
        const maxScore = getValue(row, "maxScore") ?? 100;
        return {
          studentId: row.studentId,
          score: score === "" || score === null ? null : Number(score),
          maxScore: Number(maxScore),
        };
      });

      const result = await api.post("/grades/bulk", { subjectId: Number(subjectId), term, grades });
      setSaveMessage(`✓ Saved ${result.summary.saved} grade${result.summary.saved !== 1 ? "s" : ""}${result.summary.cleared ? `, cleared ${result.summary.cleared}` : ""}`);
      fetchGrades();
    } catch (err) {
      setError(err.message || "Failed to save grades");
    } finally {
      setSaving(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const scored = rows
      .map(r => ({ score: getValue(r, "score"), max: getValue(r, "maxScore") ?? 100 }))
      .filter(r => r.score !== null && r.score !== "" && r.score !== undefined);

    if (scored.length === 0) return null;

    const pcts = scored.map(r => (Number(r.score) / Number(r.max)) * 100);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const highest = Math.max(...pcts);
    const lowest  = Math.min(...pcts);
    const passing = pcts.filter(p => p >= 60).length;

    return { avg, highest, lowest, passing, total: scored.length, graded: scored.length, ungraded: rows.length - scored.length };
  }, [rows, editedRows]);

  const selectedSection = sections.find(s => String(s.id) === sectionId);
  const selectedSubject = subjects.find(s => String(s.id) === subjectId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Grades</h2>
        <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>Enter and review student grades by class and subject</p>
      </div>

      {error && (
        <Card style={{ borderColor: C.red, background: C.redL }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Class</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} style={{ ...selectStyle, width: "100%" }} disabled={loadingFilters}>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.gradeLevel.name} – {s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Subject</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} style={{ ...selectStyle, width: "100%" }} disabled={loadingFilters}>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Term</label>
            <select value={term} onChange={e => setTerm(e.target.value)} style={{ ...selectStyle, width: "100%" }} disabled={loadingFilters}>
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            ["Class Average", `${stats.avg.toFixed(1)}%`, scoreColor(stats.avg)],
            ["Highest",        `${stats.highest.toFixed(1)}%`, C.green],
            ["Lowest",         `${stats.lowest.toFixed(1)}%`, C.red],
            ["Graded",         `${stats.graded}/${rows.length}`, C.accent],
          ].map(([l, v, c]) => (
            <Card key={l} style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Class summary chart */}
      {classSummary.length > 0 && (
        <Card style={{ padding: 18 }}>
          <SectionTitle>Class Averages — All Subjects ({term})</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={classSummary} barSize={28}>
              <XAxis dataKey="subject" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} width={32} />
              <Tooltip formatter={v => `${Number(v).toFixed(1)}%`} />
              <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                {classSummary.map((entry, i) => (
                  <Cell key={i} fill={scoreColor(entry.average)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Gradebook table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            {selectedSection ? `${selectedSection.gradeLevel.name} – ${selectedSection.name}` : "—"}
            {" · "}
            {selectedSubject?.name || "—"}
            {" · "}
            {term}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {saveMessage && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{saveMessage}</span>}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              style={{
                background: hasChanges ? C.accent : C.border,
                color: C.white, border: "none", borderRadius: 8,
                padding: "8px 18px", fontWeight: 600, fontSize: 13,
                cursor: hasChanges && !saving ? "pointer" : "default",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : hasChanges ? `Save Changes (${Object.keys(editedRows).length})` : "Save"}
            </button>
          </div>
        </div>

        {loadingGrades ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>No active students in this class.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
              <thead>
                <tr style={{ background: C.slateL, borderBottom: `2px solid ${C.border}` }}>
                  {["#", "Student", "Score", "Out of", "Percentage", "Grade"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: h === "Student" ? "left" : "center", color: C.slate, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const score    = getValue(row, "score");
                  const maxScore = getValue(row, "maxScore") ?? 100;
                  const hasScore = score !== null && score !== "" && score !== undefined;
                  const pct = hasScore ? (Number(score) / Number(maxScore)) * 100 : null;
                  const letter = pct === null ? "—" : pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
                  const isEdited = !!editedRows[row.studentId];

                  return (
                    <tr key={row.studentId} style={{ borderBottom: `1px solid ${C.border}`, background: isEdited ? C.accentL : i % 2 === 0 ? C.white : C.slateL }}>
                      <td style={{ padding: "8px 14px", color: C.slate, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: "8px 14px" }}>
                        <div style={{ fontWeight: 600, color: C.text }}>{row.name}</div>
                        <div style={{ fontSize: 11, color: C.slate }}>{row.studentCode}</div>
                      </td>
                      <td style={{ padding: "6px 14px", textAlign: "center" }}>
                        <input
                          type="number" min="0" step="0.5"
                          value={score ?? ""}
                          onChange={e => updateCell(row.studentId, "score", e.target.value)}
                          placeholder="—"
                          style={{
                            width: 70, textAlign: "center", border: `1px solid ${C.border}`, borderRadius: 6,
                            padding: "6px 8px", fontSize: 13, fontWeight: 600, outline: "none",
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 14px", textAlign: "center" }}>
                        <input
                          type="number" min="1" step="1"
                          value={maxScore ?? 100}
                          onChange={e => updateCell(row.studentId, "maxScore", e.target.value)}
                          style={{
                            width: 60, textAlign: "center", border: `1px solid ${C.border}`, borderRadius: 6,
                            padding: "6px 8px", fontSize: 13, color: C.textMid, outline: "none",
                          }}
                        />
                      </td>
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: scoreColor(pct) }}>
                          {pct === null ? "—" : `${pct.toFixed(1)}%`}
                        </span>
                      </td>
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        {letter === "—" ? (
                          <span style={{ color: C.slate }}>—</span>
                        ) : (
                          <Badge
                            label={letter}
                            color={scoreColor(pct)}
                            bg={scoreColor(pct) + "22"}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ fontSize: 11, color: C.slate, textAlign: "center" }}>
        Tip: leave the Score field empty and save to clear a grade. Changes are highlighted until saved.
      </div>
    </div>
  );
}
