import { useState, useEffect } from "react";
import { C } from "../theme";
import { Badge, Card } from "../components/Shared";
import { api } from "../api/client";
import TeacherModal from "./TeacherModal";

const statusBadge = (status) => {
  if (status === "ACTIVE")   return { color: C.green, bg: C.greenL, label: "Active" };
  if (status === "ON_LEAVE") return { color: C.amber, bg: C.amberL, label: "On Leave" };
  return { color: C.slate, bg: C.slateL, label: "Inactive" };
};

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  const [showModal, setShowModal]   = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);

  const fetchTeachers = () => {
    setLoading(true);
    api.get("/teachers")
      .then(setTeachers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeachers(); }, []);

  const openAdd  = () => { setEditTeacher(null); setShowModal(true); };
  const openEdit = (t) => { setEditTeacher(t); setShowModal(true); };
  const handleDone = () => { setShowModal(false); setEditTeacher(null); fetchTeachers(); };

  const handleDelete = async (t) => {
    if (!window.confirm(`Remove "${t.user?.name}" from staff? This deletes their login account too.`)) return;
    try {
      await api.delete(`/teachers/${t.id}`);
      fetchTeachers();
    } catch (err) {
      setError(err.message || "Failed to delete teacher");
    }
  };

  const filtered = teachers.filter(t =>
    !search || t.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Teachers</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>
            {loading ? "Loading…" : `${teachers.length} staff member${teachers.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={openAdd} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          + Add Teacher
        </button>
      </div>

      {error && (
        <Card style={{ borderColor: C.red, background: C.redL, marginBottom: 16 }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>
        </Card>
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teachers…"
          style={{ width: "100%", maxWidth: 320, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}
        />
      </div>

      {loading ? (
        <Card><div style={{ textAlign: "center", color: C.slate, padding: 24 }}>Loading…</div></Card>
      ) : filtered.length === 0 ? (
        <Card><div style={{ textAlign: "center", color: C.slate, padding: 24 }}>No teachers found.</div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(t => {
            const badge = statusBadge(t.status);
            const subjectNames = t.subjects.map(ts => ts.subject);
            return (
              <Card key={t.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.greenL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.green, fontSize: 18, flexShrink: 0 }}>
                  {t.user?.name?.charAt(0) || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{t.user?.name}</div>
                  <div style={{ fontSize: 12, color: C.slate, marginBottom: 6 }}>{t.user?.email}</div>
                  {subjectNames.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {subjectNames.map(s => (
                        <span key={s.id} style={{
                          background: (s.color || C.accent) + "1A", color: s.color || C.accent,
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                        }}>{s.name}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.slate }}>No subjects assigned</div>
                  )}
                  {t.user?.phone && (
                    <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>📱 {t.user.phone}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <Badge color={badge.color} bg={badge.bg} label={badge.label} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(t)} style={{
                      background: C.accentL, color: C.accent, border: "none", borderRadius: 6,
                      padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Edit</button>
                    <button onClick={() => handleDelete(t)} style={{
                      background: C.redL, color: C.red, border: "none", borderRadius: 6,
                      padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Delete</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <TeacherModal
          teacher={editTeacher}
          onClose={() => { setShowModal(false); setEditTeacher(null); }}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
