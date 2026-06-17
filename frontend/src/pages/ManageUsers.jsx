import { useState, useEffect } from "react";
import { C } from "../theme";
import { Card, Badge } from "../components/Shared";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6,
};

const roleBadge = (role) => {
  const colors = {
    ADMIN:   { color: C.purple, bg: C.purpleL },
    TEACHER: { color: C.green,  bg: C.greenL },
    PARENT:  { color: C.accent, bg: C.accentL },
    STUDENT: { color: C.amber,  bg: C.amberL },
    EMPLOYEE: { color: C.slate, bg: C.slateL },
  };
  return colors[role] || { color: C.slate, bg: C.slateL };
};

const ROLES = ["ADMIN", "TEACHER", "PARENT", "STUDENT", "EMPLOYEE"];

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

// ── Add User Modal ───────────────────────────────────────────────
function AddUserModal({ onClose, onDone }) {
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]     = useState("TEACHER");
  const [phone, setPhone]   = useState("");
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/users", {
        name: name.trim(), email: email.trim(), password, role,
        phone: phone.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err.message || "Failed to create user");
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
        background: C.white, borderRadius: 14, padding: 24, width: 420,
        maxWidth: "100%", boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>Add User Account</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sara Gemayel" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. sara@scube.test" style={inputStyle} />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone (optional)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+961 ..." style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Temporary Password</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => setPassword(generatePassword())} style={{
                background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
                padding: "0 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}>Generate</button>
            </div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>
              Share this with the user — they can change it later in My Account.
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
            <button type="submit" disabled={saving} style={{
              background: C.accent, color: C.white, border: "none", borderRadius: 8,
              padding: "9px 20px", fontWeight: 600, fontSize: 13,
              cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset Password Modal ─────────────────────────────────────────
function ResetPasswordModal({ targetUser, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/users/${targetUser.id}/reset-password`, { newPassword: password });
      onDone();
    } catch (err) {
      setError(err.message || "Failed to reset password");
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
        background: C.white, borderRadius: 14, padding: 24, width: 380,
        maxWidth: "100%", boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>Reset Password</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: C.textMid, margin: "0 0 14px" }}>
          Set a new password for <b>{targetUser.name}</b> ({targetUser.email}).
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>New Password</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => setPassword(generatePassword())} style={{
                background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
                padding: "0 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}>Generate</button>
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
            <button type="submit" disabled={saving} style={{
              background: C.green, color: C.white, border: "none", borderRadius: 8,
              padding: "9px 20px", fontWeight: 600, fontSize: 13,
              cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving…" : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    api.get("/users")
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { isActive: !u.isActive });
      fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to update user");
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete account for "${u.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Manage Users</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>
            {loading ? "Loading…" : `${users.length} account${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{
          background: C.accent, color: C.white, border: "none", borderRadius: 8,
          padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          + Add User
        </button>
      </div>

      {error && (
        <Card style={{ borderColor: C.red, background: C.redL }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ flex: 1, minWidth: 180, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none" }}
          />
          {["ALL", ...ROLES].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${roleFilter === r ? C.accent : C.border}`,
              background: roleFilter === r ? C.accentL : C.white,
              color: roleFilter === r ? C.accent : C.textMid,
              cursor: "pointer",
            }}>
              {r === "ALL" ? "All" : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr style={{ background: C.slateL, borderBottom: `2px solid ${C.border}` }}>
                  {["Name", "Email", "Role", "Linked Record", "Phone", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: C.slate, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const badge = roleBadge(u.role);
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%", background: C.accentL,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, color: C.accent, fontSize: 12, flexShrink: 0,
                          }}>{u.name.charAt(0)}</div>
                          <div>
                            <span style={{ fontWeight: 600, color: C.text }}>{u.name}</span>
                            {isSelf && <span style={{ fontSize: 11, color: C.slate, marginLeft: 6 }}>(you)</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", color: C.textMid }}>{u.email}</td>
                      <td style={{ padding: "11px 14px" }}><Badge label={u.role} {...badge} /></td>
                      <td style={{ padding: "11px 14px" }}>
                        {u.studentAccount ? (
                          <span style={{ fontSize: 12, color: C.textMid }}>
                            🎓 <span style={{ fontFamily: "monospace" }}>{u.studentAccount.studentCode}</span> — {u.studentAccount.name}
                          </span>
                        ) : u.teacher ? (
                          <Badge
                            label={u.teacher.status === "ACTIVE" ? "Teacher · Active" : u.teacher.status === "ON_LEAVE" ? "Teacher · On Leave" : "Teacher · Inactive"}
                            color={u.teacher.status === "ACTIVE" ? C.green : C.amber}
                            bg={u.teacher.status === "ACTIVE" ? C.greenL : C.amberL}
                          />
                        ) : u.employee ? (
                          <Badge
                            label={`${u.employee.jobTitle}${u.employee.status !== "ACTIVE" ? " · " + (u.employee.status === "ON_LEAVE" ? "On Leave" : "Inactive") : ""}`}
                            color={u.employee.status === "ACTIVE" ? C.slate : C.amber}
                            bg={u.employee.status === "ACTIVE" ? C.slateL : C.amberL}
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: C.slate }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", color: C.textMid }}>{u.phone || "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <Badge
                          label={u.isActive ? "Active" : "Inactive"}
                          color={u.isActive ? C.green : C.slate}
                          bg={u.isActive ? C.greenL : C.slateL}
                        />
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => setResetTarget(u)} style={{
                            background: C.accentL, color: C.accent, border: "none", borderRadius: 6,
                            padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}>Reset PW</button>
                          {!isSelf && (
                            <button onClick={() => toggleActive(u)} style={{
                              background: u.isActive ? C.amberL : C.greenL,
                              color: u.isActive ? C.amber : C.green,
                              border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}>{u.isActive ? "Deactivate" : "Activate"}</button>
                          )}
                          {!isSelf && (
                            <button onClick={() => handleDelete(u)} style={{
                              background: C.redL, color: C.red, border: "none", borderRadius: 6,
                              padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.slate }}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onDone={() => { setShowAddModal(false); fetchUsers(); }}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          targetUser={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => { setResetTarget(null); fetchUsers(); }}
        />
      )}
    </div>
  );
}
