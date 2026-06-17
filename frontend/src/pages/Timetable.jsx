import { useState, useEffect, useMemo } from "react";
import { C } from "../theme";
import { Card } from "../components/Shared";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import TimetableSlotModal from "./TimetableSlotModal";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABELS = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat" };

export default function Timetable() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "TEACHER";

  const [sections, setSections]         = useState([]);
  const [sectionId, setSectionId]       = useState("");
  const [entries, setEntries]           = useState([]);
  const [conflictIds, setConflictIds]   = useState(new Set());
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingEntries, setLoadingEntries]   = useState(false);
  const [error, setError]               = useState("");

  // Modal state
  const [editEntry, setEditEntry]       = useState(null);   // entry being edited
  const [addDay, setAddDay]             = useState(null);   // day to add into
  const [showModal, setShowModal]       = useState(false);

  // Load sections
  useEffect(() => {
    api.get("/sections")
      .then(data => {
        setSections(data);
        if (data.length > 0) setSectionId(String(data[0].id));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingSections(false));
  }, []);

  const fetchEntries = () => {
    if (!sectionId) return;
    setLoadingEntries(true);
    setError("");
    Promise.all([
      api.get(`/timetable?sectionId=${sectionId}`),
      canEdit ? api.get(`/timetable/conflicts?sectionId=${sectionId}`) : Promise.resolve({ conflictIds: [] }),
    ])
      .then(([tEntries, tConflicts]) => {
        setEntries(tEntries);
        setConflictIds(new Set(tConflicts.conflictIds || []));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingEntries(false));
  };

  useEffect(() => { fetchEntries(); }, [sectionId]);

  // Group entries by day
  const byDay = useMemo(() => {
    const map = {};
    DAYS.forEach(d => { map[d] = []; });
    entries.forEach(e => {
      if (map[e.day]) map[e.day].push(e);
    });
    // Sort each day by start time
    DAYS.forEach(d => { map[d].sort((a, b) => a.startTime.localeCompare(b.startTime)); });
    return map;
  }, [entries]);

  const openAdd = (day) => { setEditEntry(null); setAddDay(day); setShowModal(true); };
  const openEdit = (entry) => { setEditEntry(entry); setAddDay(null); setShowModal(true); };
  const handleDone = () => { setShowModal(false); setEditEntry(null); setAddDay(null); fetchEntries(); };

  const handleDelete = async (entry, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${entry.subject?.name} on ${DAY_LABELS[entry.day]} at ${entry.startTime}?`)) return;
    try {
      await api.delete(`/timetable/${entry.id}`);
      fetchEntries();
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  };

  const selectedSection = sections.find(s => String(s.id) === sectionId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Timetable</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>
            {selectedSection ? `${selectedSection.gradeLevel.name} – ${selectedSection.name}` : "Select a class"}
          </p>
        </div>
        <select
          value={sectionId}
          onChange={e => setSectionId(e.target.value)}
          disabled={loadingSections}
          style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, outline: "none", background: C.white }}
        >
          {sections.map(s => (
            <option key={s.id} value={s.id}>{s.gradeLevel.name} – {s.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <Card style={{ borderColor: C.red, background: C.redL }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>
        </Card>
      )}

      {/* Conflict warning banner */}
      {conflictIds.size > 0 && (
        <div style={{ background: C.redL, border: `1px solid ${C.red}40`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔴</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
              {conflictIds.size} scheduling conflict{conflictIds.size !== 1 ? "s" : ""} detected
            </span>
            <span style={{ fontSize: 12, color: C.red, marginLeft: 6 }}>
              — A teacher is scheduled in two classes at the same time. Conflicting slots are marked in red.
            </span>
          </div>
        </div>
      )}

      {/* Timetable grid */}
      {loadingEntries ? (
        <Card><div style={{ textAlign: "center", color: C.slate, padding: 32 }}>Loading…</div></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${DAYS.length}, 1fr)`, gap: 10 }}>
          {DAYS.map(day => {
            const dayEntries = byDay[day] || [];
            return (
              <div key={day} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Day header */}
                <div style={{
                  background: C.navy, color: C.white, borderRadius: 8,
                  padding: "8px 0", textAlign: "center", fontWeight: 700, fontSize: 13,
                }}>
                  {DAY_LABELS[day]}
                </div>

                {/* Slots */}
                {dayEntries.map(entry => {
                  const hasConflict = conflictIds.has(entry.id);
                  const color = entry.subject?.color || C.slate;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => canEdit && openEdit(entry)}
                      style={{
                        borderRadius: 8, padding: "8px 10px",
                        background: hasConflict ? C.redL : color + "18",
                        border: `1.5px solid ${hasConflict ? C.red : color + "55"}`,
                        cursor: canEdit ? "pointer" : "default",
                        position: "relative",
                      }}
                    >
                      {/* Conflict dot */}
                      {hasConflict && (
                        <div title="Teacher conflict!" style={{
                          position: "absolute", top: 6, right: 6,
                          width: 8, height: 8, borderRadius: "50%", background: C.red,
                        }} />
                      )}
                      <div style={{ fontSize: 10, color: hasConflict ? C.red : C.slate, fontWeight: 600, marginBottom: 3 }}>
                        {entry.startTime} – {entry.endTime}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: hasConflict ? C.red : color, lineHeight: 1.3 }}>
                        {entry.subject?.name}
                      </div>
                      {entry.teacher?.name && (
                        <div style={{ fontSize: 11, color: hasConflict ? C.red : C.slate, marginTop: 3 }}>
                          👤 {entry.teacher.name}
                        </div>
                      )}
                      {canEdit && (
                        <button
                          onClick={(e) => handleDelete(entry, e)}
                          title="Remove slot"
                          style={{
                            position: "absolute", bottom: 4, right: 4,
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: 11, color: C.slate, opacity: 0.6, padding: 2,
                            lineHeight: 1,
                          }}
                        >✕</button>
                      )}
                    </div>
                  );
                })}

                {/* Add slot button */}
                {canEdit && (
                  <button
                    onClick={() => openAdd(day)}
                    style={{
                      background: "none", border: `1.5px dashed ${C.border}`, borderRadius: 8,
                      padding: "8px 0", color: C.slate, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", textAlign: "center",
                    }}
                  >+ Add</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {entries.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[...new Set(entries.map(e => e.subject?.name))].filter(Boolean).map(name => {
            const entry = entries.find(e => e.subject?.name === name);
            const color = entry?.subject?.color || C.slate;
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textMid }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: color }} />{name}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <TimetableSlotModal
          entry={editEntry}
          sectionId={sectionId}
          defaultDay={addDay}
          onClose={() => { setShowModal(false); setEditEntry(null); setAddDay(null); }}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
