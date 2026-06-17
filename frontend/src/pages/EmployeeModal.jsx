import { useState } from "react";
import { C } from "../theme";
import { api } from "../api/client";

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6,
};

// Used for both Add and Edit. If `employee` is passed -> Edit mode.
export default function EmployeeModal({ onClose, onDone, employee }) {
  const isEdit = Boolean(employee);

  const [name, setName]   = useState(employee?.user?.name || "");
  const [email, setEmail] = useState(employee?.user?.email || "");
  const [phone, setPhone] = useState(employee?.user?.phone || "");
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle || "");
  const [baseSalary, setBaseSalary] = useState(employee?.baseSalary != null ? String(employee.baseSalary) : "");
  const [status, setStatus] = useState(employee?.status || "ACTIVE");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [resetting, setResetting] = useState(false);

  const COMMON_TITLES = ["Accountant", "Administrative Assistant", "Janitor", "IT Support", "Librarian", "Security", "Driver", "Nurse"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Name is required."); return; }
    if (!isEdit && !email.trim()) { setError("Email is required."); return; }
    if (!jobTitle.trim()) { setError("Job title is required."); return; }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/employees/${employee.id}`, {
          name: name.trim(),
          phone: phone.trim() || null,
          jobTitle: jobTitle.trim(),
          baseSalary: baseSalary === "" ? null : Number(baseSalary),
          status,
        });
        onDone();
      } else {
        const created = await api.post("/employees", {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          jobTitle: jobTitle.trim(),
          baseSalary: baseSalary === "" ? undefined : Number(baseSalary),
          status,
        });
        setCreatedAccount(created.account);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    setError("");
    try {
      const result = await api.post(`/employees/${employee.id}/reset-password`);
      setResetResult(result.password);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  // ── Success screen (Add mode) ──────────────────────────────────
  if (createdAccount) {
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) onDone(); }} style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: 16,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: C.white, borderRadius: 14, padding: 28, width: 420,
          maxWidth: "100%", boxShadow: "0 8px 32px rgba(15,23,42,0.18)", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>Employee Added!</h2>
          <p style={{ fontSize: 13, color: C.textMid, margin: "0 0 16px" }}>
            <b>{name}</b> has been added as <b>{jobTitle}</b>.
          </p>

          <div style={{ background: C.accentL, border: `1px solid ${C.accent}40`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              🔑 Login Account Created
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: C.slate }}>Email</span>
              <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{createdAccount.email}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: C.slate }}>Password</span>
              <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{createdAccount.password}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMid, marginTop: 8 }}>
              Save this now — it won't be shown again.
            </div>
          </div>

          <button onClick={onDone} style={{
            background: C.accent, color: C.white, border: "none", borderRadius: 8,
            padding: "9px 24px", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>Done</button>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, padding: 24, width: 440,
        maxWidth: "100%", maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>
              {isEdit ? "Edit Employee" : "Add Employee"}
            </h2>
            {isEdit && <p style={{ fontSize: 12, color: C.slate, margin: "3px 0 0" }}>{employee.user?.email}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate, padding: 4 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Joseph Matta" style={inputStyle} />
          </div>

          {!isEdit && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. joseph.matta@scube.test" style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Job Title</label>
            <input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Accountant"
              style={inputStyle}
              list="job-title-suggestions"
            />
            <datalist id="job-title-suggestions">
              {COMMON_TITLES.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Monthly Base Salary ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={baseSalary}
                onChange={e => setBaseSalary(e.target.value)}
                placeholder="e.g. 800"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Phone (optional)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+961 ..." style={inputStyle} />
          </div>

          {/* Reset password (edit mode only) */}
          {isEdit && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Account</label>
              {resetResult ? (
                <div style={{ background: C.accentL, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>New Password</div>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{resetResult}</div>
                  <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>Save this now — it won't be shown again.</div>
                </div>
              ) : (
                <button type="button" onClick={handleResetPassword} disabled={resetting} style={{
                  background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
                  padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {resetting ? "Resetting…" : "Reset Password"}
                </button>
              )}
            </div>
          )}

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
            <button type="submit" disabled={submitting} style={{
              background: isEdit ? C.green : C.accent, color: C.white, border: "none", borderRadius: 8,
              padding: "9px 20px", fontWeight: 600, fontSize: 13,
              cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
