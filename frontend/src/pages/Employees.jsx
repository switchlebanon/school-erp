import { useState, useEffect } from "react";
import { C } from "../theme";
import { Badge, Card } from "../components/Shared";
import { api } from "../api/client";
import EmployeeModal from "./EmployeeModal";

const DEPARTMENTS = [
  { value: "ALL",              label: "All" },
  { value: "ADMINISTRATION",   label: "Administration" },
  { value: "TEACHING_SUPPORT", label: "Teaching Support" },
  { value: "FINANCE",          label: "Finance" },
  { value: "FACILITIES",       label: "Facilities" },
  { value: "IT",               label: "IT" },
  { value: "SECURITY",         label: "Security" },
  { value: "TRANSPORT",        label: "Transport" },
  { value: "HEALTH",           label: "Health" },
  { value: "OTHER",            label: "Other" },
];

const DEPT_LABEL = Object.fromEntries(DEPARTMENTS.map(d => [d.value, d.label]));

const statusBadge = (status) => {
  if (status === "ACTIVE")   return { color: C.green, bg: C.greenL, label: "Active" };
  if (status === "ON_LEAVE") return { color: C.amber, bg: C.amberL, label: "On Leave" };
  return { color: C.slate, bg: C.slateL, label: "Inactive" };
};

const fmt = (n) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [activeDept, setActiveDept] = useState("ALL");

  const [showModal, setShowModal]     = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);

  const fetchEmployees = () => {
    setLoading(true);
    api.get("/employees")
      .then(setEmployees)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEmployees(); }, []);

  const openAdd  = () => { setEditEmployee(null); setShowModal(true); };
  const openEdit = (e) => { setEditEmployee(e); setShowModal(true); };
  const handleDone = () => { setShowModal(false); setEditEmployee(null); fetchEmployees(); };

  const handleDelete = async (e) => {
    if (!window.confirm(`Remove "${e.user?.name}" from staff? This deletes their login account and salary history.`)) return;
    try {
      await api.delete(`/employees/${e.id}`);
      fetchEmployees();
    } catch (err) {
      setError(err.message || "Failed to delete employee");
    }
  };

  const filtered = employees.filter(e => {
    const matchesDept = activeDept === "ALL" || e.department === activeDept;
    const matchesSearch = !search ||
      e.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.jobTitle?.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Employees</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>
            {loading ? "Loading…" : `${employees.length} staff member${employees.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={openAdd} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          + Add Employee
        </button>
      </div>

      {error && (
        <Card style={{ borderColor: C.red, background: C.redL, marginBottom: 16 }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>
        </Card>
      )}

      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or job title…"
          style={{ width: "100%", maxWidth: 320, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}
        />
      </div>

      {/* Department filter tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {DEPARTMENTS.map(d => {
          const count = d.value === "ALL" ? employees.length : employees.filter(e => e.department === d.value).length;
          if (d.value !== "ALL" && count === 0) return null;
          const isActive = activeDept === d.value;
          return (
            <button
              key={d.value}
              onClick={() => setActiveDept(d.value)}
              style={{
                padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: isActive ? C.accent : C.slateL,
                color: isActive ? C.white : C.slate,
                transition: "background 0.15s",
              }}
            >
              {d.label} <span style={{ opacity: 0.75 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card><div style={{ textAlign: "center", color: C.slate, padding: 24 }}>Loading…</div></Card>
      ) : filtered.length === 0 ? (
        <Card><div style={{ textAlign: "center", color: C.slate, padding: 24 }}>No employees found.</div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(e => {
            const badge = statusBadge(e.status);
            return (
              <Card key={e.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.slateL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.slate, fontSize: 18, flexShrink: 0 }}>
                  {e.user?.name?.charAt(0) || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{e.user?.name}</div>
                  <div style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>{e.user?.email}</div>
                  <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{e.jobTitle}</div>
                  {e.department && e.department !== "OTHER" && (
                    <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>
                      🏢 {DEPT_LABEL[e.department] || e.department}
                    </div>
                  )}
                  {e.baseSalary != null && (
                    <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>Base salary: {fmt(e.baseSalary)}/month</div>
                  )}
                  {e.user?.phone && (
                    <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>📱 {e.user.phone}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <Badge color={badge.color} bg={badge.bg} label={badge.label} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(e)} style={{
                      background: C.accentL, color: C.accent, border: "none", borderRadius: 6,
                      padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Edit</button>
                    <button onClick={() => handleDelete(e)} style={{
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
        <EmployeeModal
          employee={editEmployee}
          onClose={() => { setShowModal(false); setEditEmployee(null); }}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
