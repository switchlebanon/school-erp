import { useState, useEffect } from "react";
import { C } from "../theme";
import { Badge, Card, SectionTitle, feeColor, statusColor } from "../components/Shared";
import { api } from "../api/client";
import StudentModal from "./AddStudentModal";
import InvoicePrint from "./InvoicePrint";
import ImportStudentsModal from "./ImportStudentsModal";
import ManageClassesModal from "./ManageClassesModal";

const statusLabel = (s) => {
  if (!s) return "Active";
  return s.charAt(0) + s.slice(1).toLowerCase();
};

const ATTENDANCE_STYLE = {
  PRESENT: { label: "Present", color: C.green,  bg: C.greenL,  icon: "✓" },
  ABSENT:  { label: "Absent",  color: C.red,    bg: C.redL,    icon: "✗" },
  LATE:    { label: "Late",    color: C.amber,  bg: C.amberL,  icon: "⏰" },
  EXCUSED: { label: "Excused", color: C.accent, bg: C.accentL, icon: "📝" },
};

// Shows a student's recent attendance history plus a yearly absence counter
function StudentAttendancePanel({ studentId }) {
  const [records, setRecords] = useState(null);
  const [yearly, setYearly]   = useState(null);
  const [error, setError]     = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(`/attendance/student/${studentId}?limit=15`),
      api.get(`/attendance/yearly/${studentId}`),
    ])
      .then(([recordsData, yearlyData]) => {
        if (active) { setRecords(recordsData); setYearly(yearlyData); }
      })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [studentId]);

  if (error) return <div style={{ fontSize: 13, color: C.red }}>{error}</div>;
  if (records === null) return <div style={{ fontSize: 13, color: C.slate }}>Loading…</div>;

  return (
    <div>
      {/* Yearly absence counter */}
      {yearly && (
        <div style={{ background: C.slateL, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Academic Year {yearly.academicYear} — Absence Counter
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: yearly.counted > 0 ? C.red : C.text }}>{yearly.counted}</div>
              <div style={{ fontSize: 11, color: C.slate }}>Counted absences</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>{yearly.excused}</div>
              <div style={{ fontSize: 11, color: C.slate }}>Excused (not counted)</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.amber }}>{yearly.late}</div>
              <div style={{ fontSize: 11, color: C.slate }}>Late</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.textMid, marginTop: 8 }}>
            Excused absences (with a reason like sick leave) don't count toward the limit.
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div style={{ fontSize: 13, color: C.slate }}>No attendance recorded yet.</div>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Recent Days
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {records.map(r => {
              const info = ATTENDANCE_STYLE[r.status] || ATTENDANCE_STYLE.PRESENT;
              return (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}`, gap: 10 }}>
                  <span style={{ fontSize: 13, color: C.textMid, whiteSpace: "nowrap" }}>
                    {new Date(r.date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  {r.reason && (
                    <span style={{ fontSize: 12, color: C.slate, flex: 1, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.reason}
                    </span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 700, color: info.color, background: info.bg, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
                    {info.icon} {info.label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Shows a student's grade history, fetched on demand
function StudentGradesPanel({ studentId }) {
  const [grades, setGrades] = useState(null);
  const [error, setError]   = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/grades/student/${studentId}`)
      .then(data => { if (active) setGrades(data); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [studentId]);

  const scoreColor = (pct) => {
    if (pct >= 85) return C.green;
    if (pct >= 75) return C.accent;
    if (pct >= 65) return C.amber;
    return C.red;
  };

  if (error) return <div style={{ fontSize: 13, color: C.red }}>{error}</div>;
  if (grades === null) return <div style={{ fontSize: 13, color: C.slate }}>Loading…</div>;
  if (grades.length === 0) return <div style={{ fontSize: 13, color: C.slate }}>No grades recorded yet.</div>;

  // Group by term
  const byTerm = {};
  grades.forEach(g => {
    if (!byTerm[g.term]) byTerm[g.term] = [];
    byTerm[g.term].push(g);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.entries(byTerm).map(([term, records]) => (
        <div key={term}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>{term}</div>
          {records.map(g => {
            const pct = (g.score / g.maxScore) * 100;
            return (
              <div key={g.subject} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ width: 110, fontSize: 13, color: C.textMid, flexShrink: 0 }}>{g.subject}</span>
                <div style={{ flex: 1, background: C.slateL, borderRadius: 4, height: 8 }}>
                  <div style={{ width: `${Math.min(100, pct)}%`, background: scoreColor(pct), height: 8, borderRadius: 4 }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: scoreColor(pct), width: 70, textAlign: "right" }}>
                  {g.score}/{g.maxScore} ({pct.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Students() {
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [editStudent, setEditStudent]   = useState(null);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClassesModal, setShowClassesModal] = useState(false);

  const normalize = (s) => ({
    id: s.id,
    studentCode: s.studentCode,
    name: s.name,
    grade: s.section?.gradeLevel?.name || "—",
    section: s.section?.name || "—",
    sectionId: s.sectionId,
    status: statusLabel(s.status),
    rawStatus: s.status,
    guardian: s.guardian?.name || s.guardianName || "—",
    guardianName: s.guardianName || "",
    guardianPhone: s.guardianPhone || "",
    guardianId: s.guardianId || null,
    dateOfBirth: s.dateOfBirth,
    gpa: "—",
    fees: "—",
  });

  const fetchStudents = () => {
    setLoading(true);
    return api.get("/students")
      .then((data) => setStudents(data.map(normalize)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, []);

  const openAdd  = () => { setEditStudent(null); setShowModal(true); };
  const openEdit = (s, e) => { e.stopPropagation(); setEditStudent(s); setShowModal(true); };

  // onDone receives an optional invoice when "Print Receipt" is clicked
  const handleDone = (invoiceToPrint) => {
    setShowModal(false);
    setEditStudent(null);
    fetchStudents();
    if (invoiceToPrint) setPrintInvoice(invoiceToPrint);
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.grade.toLowerCase().includes(search.toLowerCase())
  );

  // ── Student detail view ──────────────────────────────────────────
  if (selected) {
    const s = selected;
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, cursor: "pointer", fontSize: 14, marginBottom: 20, padding: 0 }}
        >
          ← Back to Students
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", background: C.accentL,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, color: C.accent, fontSize: 24, flexShrink: 0,
              }}>
                {s.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{s.name}</div>
                <div style={{ color: C.slate, fontSize: 13 }}>{s.grade} – Section {s.section}</div>
                <div style={{ color: C.slate, fontSize: 12, marginTop: 2 }}>Code: {s.studentCode}</div>
                <div style={{ marginTop: 6 }}><Badge {...statusColor(s.status)} label={s.status} /></div>
              </div>
              {/* Edit button on detail view */}
              <button
                onClick={(e) => { openEdit(s, e); setSelected(null); }}
                style={{
                  background: C.accentL, color: C.accent, border: "none", borderRadius: 8,
                  padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", flexShrink: 0,
                }}
              >
                ✏️ Edit Student
              </button>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 14, display: "flex", gap: 24 }}>
              {[["Guardian", s.guardian], ["Date of Birth", s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : "—"]].map(([k, v]) => (
                <div key={k} style={{ fontSize: 13 }}>
                  <div style={{ color: C.slate, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{k}</div>
                  <div style={{ color: C.text, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Grades</SectionTitle>
            <StudentGradesPanel studentId={s.id} />
          </Card>

          <Card>
            <SectionTitle>Attendance</SectionTitle>
            <StudentAttendancePanel studentId={s.id} />
          </Card>
        </div>

        {showModal && (
          <StudentModal
            student={editStudent}
            onClose={() => { setShowModal(false); setEditStudent(null); }}
            onDone={() => { handleDone(); }}
          />
        )}
      </div>
    );
  }

  // ── Student list ────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Students</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>
            {loading ? "Loading…" : `${students.length} enrolled`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowClassesModal(true)}
            style={{ background: C.slateL, color: C.textMid, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            🏫 Manage Classes
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            style={{ background: C.accentL, color: C.accent, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            📥 Import from Excel
          </button>
          <button
            onClick={openAdd}
            style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            + Add Student
          </button>
        </div>
      </div>

      {error && (
        <Card style={{ marginBottom: 16, borderColor: C.red, background: C.redL }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>Couldn't load students</div>
          <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{error}</div>
        </Card>
      )}

      <Card>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or grade…"
          style={{
            width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "8px 12px", fontSize: 13, marginBottom: 14,
            boxSizing: "border-box", outline: "none",
          }}
        />

        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: C.slate, fontSize: 13 }}>Loading students…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 540 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {["Name", "Grade", "GPA", "Fees", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.slate, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                    onClick={() => setSelected(s)}
                  >
                    <td style={{ padding: "11px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%", background: C.accentL,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 700, color: C.accent, fontSize: 12, flexShrink: 0,
                        }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: C.text }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: C.slate }}>{s.guardian}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 10px", color: C.textMid }}>{s.grade} – {s.section}</td>
                    <td style={{ padding: "11px 10px", fontWeight: 600, color: C.textMid }}>{s.gpa}</td>
                    <td style={{ padding: "11px 10px" }}>
                      {s.fees === "—"
                        ? <span style={{ color: C.slate }}>—</span>
                        : <Badge {...feeColor(s.fees)} label={s.fees} />}
                    </td>
                    <td style={{ padding: "11px 10px" }}>
                      <Badge {...statusColor(s.status)} label={s.status} />
                    </td>
                    <td style={{ padding: "11px 10px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                          style={{ background: C.accentL, color: C.accent, border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => openEdit(s, e)}
                          style={{ background: C.greenL, color: C.green, border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.slate }}>
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <StudentModal
          student={editStudent}
          onClose={() => { setShowModal(false); setEditStudent(null); }}
          onDone={handleDone}
        />
      )}

      {printInvoice && (
        <InvoicePrint
          invoice={printInvoice}
          onClose={() => setPrintInvoice(null)}
        />
      )}

      {showImportModal && (
        <ImportStudentsModal
          onClose={() => setShowImportModal(false)}
          onDone={() => { setShowImportModal(false); fetchStudents(); }}
        />
      )}

      {showClassesModal && (
        <ManageClassesModal
          onClose={() => setShowClassesModal(false)}
          onChanged={fetchStudents}
        />
      )}
    </div>
  );
}
