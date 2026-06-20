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
const sectionHeading = (label) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase",
    letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 8,
    borderBottom: `1px solid ${C.border}`,
  }}>{label}</div>
);

// Used for both Add and Edit.
// If `student` prop is passed → Edit mode.
export default function StudentModal({ onClose, onDone, student, defaultSectionId }) {
  const isEdit = Boolean(student);

  // ── Student fields ───────────────────────────────────────────
  const [sections, setSections]         = useState([]);
  const [loadingSections, setLoading]   = useState(true);
  const [studentCode, setStudentCode]   = useState(student?.studentCode || "");
  const [name, setName]                 = useState(student?.name || "");
  const [dateOfBirth, setDateOfBirth]   = useState(student?.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "");
  const [sectionId, setSectionId]       = useState(student?.sectionId ? String(student.sectionId) : defaultSectionId ? String(defaultSectionId) : "");
  const [status, setStatus]             = useState(student?.rawStatus || "ACTIVE");
  const [guardianName, setGuardianName] = useState(student?.guardianName || "");
  const [guardianPhone, setGuardianPhone] = useState(student?.guardianPhone || "");
  const [guardianAccountId, setGuardianAccountId] = useState(student?.guardianId ? String(student.guardianId) : "");
  const [parentAccounts, setParentAccounts] = useState([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [studentAccount, setStudentAccount] = useState(null); // { exists, email, isActive }
  const [resetPasswordResult, setResetPasswordResult] = useState(null);
  const [accountActionError, setAccountActionError] = useState("");
  const [accountActionLoading, setAccountActionLoading] = useState(false);

  // ── Tuition fee fields (Add mode only) ───────────────────────
  const [addFee, setAddFee]             = useState(true);  // toggle
  const [feeDescription, setFeeDesc]   = useState("Annual Tuition Fee");
  const [feeAmount, setFeeAmount]       = useState("1800");
  const [feeDueDate, setFeeDueDate]     = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  // ── First payment fields ──────────────────────────────────────
  const [addPayment, setAddPayment]     = useState(false);
  const [payAmount, setPayAmount]       = useState("");
  const [payNote, setPayNote]           = useState("Cash");
  const [payDate, setPayDate]           = useState(new Date().toISOString().slice(0, 10));

  const [error, setError]               = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [step, setStep]                 = useState("form"); // "form" | "success"
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [createdStudentCode, setCreatedStudentCode] = useState(null);
  const [createdParentAccount, setCreatedParentAccount] = useState(null);

  useEffect(() => {
    api.get("/sections")
      .then((data) => {
        setSections(data);
        if (!isEdit && data.length > 0) setSectionId(String(data[0].id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    if (isEdit) {
      api.get("/users?role=PARENT")
        .then(setParentAccounts)
        .catch(() => {})
        .finally(() => setLoadingParents(false));

      api.get(`/students/${student.id}/account`)
        .then(setStudentAccount)
        .catch(() => {});
    } else {
      setLoadingParents(false);
    }
  }, []);

  const handleCreateStudentAccount = async () => {
    setAccountActionError("");
    setAccountActionLoading(true);
    try {
      const account = await api.post(`/students/${student.id}/account`);
      setStudentAccount({ exists: true, email: account.email, isActive: true });
      setResetPasswordResult({ email: account.email, password: account.password });
    } catch (err) {
      setAccountActionError(err.message || "Failed to create account");
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleResetStudentPassword = async () => {
    setAccountActionError("");
    setAccountActionLoading(true);
    try {
      const result = await api.post(`/students/${student.id}/account/reset-password`);
      setResetPasswordResult({ email: studentAccount.email, password: result.password });
    } catch (err) {
      setAccountActionError(err.message || "Failed to reset password");
    } finally {
      setAccountActionLoading(false);
    }
  };

  // When fee amount changes, default first payment to full amount
  useEffect(() => {
    if (!isEdit && addPayment && !payAmount) setPayAmount(feeAmount);
  }, [addPayment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate student fields
    if (!name.trim() || !sectionId) { setError("Name and section are required."); return; }
    if (!isEdit && !dateOfBirth) { setError("Date of birth is required — it's used to generate the student ID."); return; }
    if (!isEdit && !guardianName.trim()) { setError("Guardian name is required."); return; }
    if (!isEdit && !guardianPhone.trim()) { setError("Guardian WhatsApp number is required."); return; }
    if (!isEdit && addFee) {
      if (!feeAmount || Number(feeAmount) <= 0) { setError("Please enter a valid tuition amount."); return; }
      if (!feeDueDate) { setError("Please set a due date for the fee."); return; }
      if (addPayment) {
        if (!payAmount || Number(payAmount) <= 0) { setError("Please enter a valid first payment amount."); return; }
        if (Number(payAmount) > Number(feeAmount)) { setError("First payment cannot exceed the total tuition amount."); return; }
      }
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        // Edit: just update student
        await api.put(`/students/${student.id}`, {
          name: name.trim(),
          dateOfBirth:   dateOfBirth || undefined,
          sectionId:     Number(sectionId),
          status,
          guardianName:  guardianName.trim() || undefined,
          guardianPhone: guardianPhone.trim() || undefined,
          guardianId:    guardianAccountId ? Number(guardianAccountId) : null,
        });
        onDone();
        return;
      }

      // ── Create student ──
      const newStudent = await api.post("/students", {
        name:          name.trim(),
        dateOfBirth:   dateOfBirth,
        sectionId:     Number(sectionId),
        status,
        guardianName:  guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
      });

      if (newStudent.account) {
        setCreatedAccount(newStudent.account);
      }
      if (newStudent.parentAccount) {
        setCreatedParentAccount(newStudent.parentAccount);
      }
      setCreatedStudentCode(newStudent.studentCode);

      let invoice = null;

      if (addFee) {
        // ── Create tuition invoice ──
        invoice = await api.post("/fees", {
          studentId:   newStudent.id,
          description: feeDescription.trim() || "Annual Tuition Fee",
          amount:      Number(feeAmount),
          dueDate:     feeDueDate,
        });

        if (addPayment && Number(payAmount) > 0) {
          // ── Record first payment ──
          invoice = await api.post(`/fees/${invoice.id}/pay`, {
            amount:  Number(payAmount),
            note:    payNote.trim() || undefined,
          });
          // Attach student info so print preview works
          invoice.student = { ...newStudent, section: sections.find(s => String(s.id) === sectionId) };
          invoice.student.section = sections.find(s => String(s.id) === sectionId);
        }
      }

      setCreatedInvoice(invoice);
      setStep("success");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────
  if (step === "success") {
    const paid   = createdInvoice ? Number(createdInvoice.totalPaid || 0) : 0;
    const total  = createdInvoice ? Number(createdInvoice.amount || 0) : 0;
    const remaining = total - paid;

    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 16,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: C.white, borderRadius: 14, padding: 28, width: 420,
          maxWidth: "100%", boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>Student Added!</h2>
          <p style={{ fontSize: 13, color: C.textMid, margin: "0 0 4px" }}>
            <b>{name}</b> has been enrolled successfully.
          </p>
          {createdStudentCode && (
            <p style={{ fontSize: 13, color: C.slate, margin: "0 0 20px" }}>
              Student ID: <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.accent }}>{createdStudentCode}</span>
            </p>
          )}

          {createdAccount && (
            <div style={{ background: C.accentL, border: `1px solid ${C.accent}40`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                🎓 Student Login
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.slate }}>Email</span>
                  <span style={{ fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{createdAccount.email}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.slate }}>Password</span>
                  <span style={{ fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{createdAccount.password}</span>
                </div>
              </div>
            </div>
          )}

          {createdParentAccount && (
            <div style={{ background: createdParentAccount.isExisting ? C.amberL : C.greenL, border: `1px solid ${createdParentAccount.isExisting ? C.amber : C.green}40`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: createdParentAccount.isExisting ? C.amber : C.green, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                👨‍👩‍👧 {createdParentAccount.isExisting ? "Existing Parent Account — Student Linked" : "Parent Login Created"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.slate }}>Email</span>
                  <span style={{ fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{createdParentAccount.email}</span>
                </div>
                {createdParentAccount.isExisting ? (
                  <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>
                    This parent already has an account — the new student has been linked to it automatically. They can log in with their existing password.
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: C.slate }}>Password</span>
                      <span style={{ fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{createdParentAccount.password}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>
                      Save these credentials — passwords won't be shown again.
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {createdInvoice && (
            <div style={{ background: C.slateL, borderRadius: 10, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Invoice Created</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["Description", createdInvoice.description],
                  ["Total Amount", "$" + Number(createdInvoice.amount).toLocaleString()],
                  ["Amount Paid",  paid > 0 ? "$" + paid.toLocaleString() : "Not yet paid"],
                  ["Balance Due",  "$" + remaining.toLocaleString()],
                  ["Status", createdInvoice.status],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.slate }}>{k}</span>
                    <span style={{
                      fontWeight: 600,
                      color: k === "Amount Paid" ? C.green
                           : k === "Balance Due" && remaining > 0 ? C.amber
                           : k === "Status" ? (createdInvoice.status === "PAID" ? C.green : C.amber)
                           : C.text,
                    }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onDone} style={{
              background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
              padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Done</button>

            {/* Send credentials via WhatsApp to guardian */}
            {guardianPhone && (createdAccount || createdParentAccount) && (() => {
              const phone = guardianPhone.replace(/[^\d]/g, "");
              const appUrl = window.location.origin;
              var msg = "Hello " + guardianName + ",\n\n";
              msg += "Welcome to S³ ERP! Here are the login credentials for your family:\n\n";
              msg += "🌐 App: " + appUrl + "\n\n";
              if (createdAccount) {
                msg += "🎓 *Student Login (" + name + ")*\n";
                msg += "• Email: " + createdAccount.email + "\n";
                msg += "• Password: " + createdAccount.password + "\n\n";
              }
              if (createdParentAccount && !createdParentAccount.isExisting) {
                msg += "👨‍👩‍👧 *Parent Login*\n";
                msg += "• Email: " + createdParentAccount.email + "\n";
                msg += "• Password: " + createdParentAccount.password + "\n\n";
              } else if (createdParentAccount && createdParentAccount.isExisting) {
                msg += "👨‍👩‍👧 *Parent Login*\n";
                msg += "• Email: " + createdParentAccount.email + "\n";
                msg += "• Password: (your existing password)\n\n";
              }
              msg += "Please save these credentials and change your password after first login.\n\n";
              msg += "*S³ School Administration*";
              const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);
              return (
                <button
                  onClick={() => window.open(url, "_blank")}
                  style={{
                    background: "#25D366", color: C.white, border: "none", borderRadius: 8,
                    padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  💬 Send via WhatsApp
                </button>
              );
            })()}
            {createdInvoice && (
              <button
                onClick={() => { onDone(createdInvoice); }}
                style={{
                  background: C.navy, color: C.white, border: "none", borderRadius: 8,
                  padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >
                🖨️ Print Receipt
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, padding: 24, width: 480,
        maxWidth: "100%", maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>
              {isEdit ? "Edit Student" : "Add Student"}
            </h2>
            {isEdit && <p style={{ fontSize: 12, color: C.slate, margin: "3px 0 0" }}>Code: <b>{student.studentCode}</b></p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate, padding: 4 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Section 1: Student Info ── */}
          {sectionHeading("Student Information")}

          {!isEdit && (
            <div style={{ background: C.accentL, borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: C.accent, fontWeight: 600 }}>
              🪪 Student ID will be auto-generated as <span style={{ fontFamily: "monospace" }}>S3-YYYYMMDD-XXX</span> based on date of birth
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Yara Bitar" style={inputStyle} />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Section</label>
              <select value={sectionId} onChange={e => setSectionId(e.target.value)} style={inputStyle} disabled={loadingSections}>
                {loadingSections && <option>Loading…</option>}
                {!loadingSections && sections.length === 0 && <option value="">No sections found</option>}
                {sections.map(s => <option key={s.id} value={s.id}>{s.gradeLevel.name} – {s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="GRADUATED">Graduated</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Date of Birth <span style={{ color: C.red }}>*</span>
              {!isEdit && <span style={{ fontWeight: 400, color: C.slate, fontSize: 10, marginLeft: 4 }}>(required to generate student ID)</span>}
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              style={{ ...inputStyle, border: !isEdit && !dateOfBirth ? `1px solid ${C.red}` : `1px solid ${C.border}` }}
              required={!isEdit}
            />
          </div>

          {/* Guardian info */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                Guardian Name {!isEdit && <span style={{ color: C.red }}>*</span>}
              </label>
              <input
                value={guardianName}
                onChange={e => setGuardianName(e.target.value)}
                placeholder="e.g. Hassan Khalil"
                style={{ ...inputStyle, border: !isEdit && !guardianName.trim() ? `1px solid ${C.red}` : `1px solid ${C.border}` }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                Guardian WhatsApp 📱 {!isEdit && <span style={{ color: C.red }}>*</span>}
              </label>
              <input
                value={guardianPhone}
                onChange={e => setGuardianPhone(e.target.value)}
                placeholder="+961 71 234 567"
                style={{ ...inputStyle, border: !isEdit && !guardianPhone.trim() ? `1px solid ${C.red}` : `1px solid ${C.border}` }}
              />
            </div>
          </div>

          {/* Linked parent portal account (Edit mode only) */}
          {isEdit && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>
                Linked Parent Account
                <span style={{ fontWeight: 400, color: C.slate, fontSize: 10, marginLeft: 4 }}>
                  (gives portal access to this student's data)
                </span>
              </label>
              <select
                value={guardianAccountId}
                onChange={e => setGuardianAccountId(e.target.value)}
                style={inputStyle}
                disabled={loadingParents}
              >
                <option value="">— No linked account —</option>
                {parentAccounts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                ))}
              </select>
              {parentAccounts.length === 0 && !loadingParents && (
                <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>
                  No parent accounts yet — create one in Manage Users (role: Parent), then link it here.
                </div>
              )}
            </div>
          )}

          {/* Student's own login account */}
          {isEdit && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Student Login Account</label>

              {studentAccount === null && (
                <div style={{ fontSize: 13, color: C.slate }}>Loading…</div>
              )}

              {studentAccount?.exists && (
                <div style={{ background: C.greenL, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>✓ Account exists</span>
                    <button
                      type="button"
                      onClick={handleResetStudentPassword}
                      disabled={accountActionLoading}
                      style={{
                        background: C.white, color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 6,
                        padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Reset Password
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMid, fontFamily: "monospace" }}>{studentAccount.email}</div>
                </div>
              )}

              {studentAccount && !studentAccount.exists && (
                <div style={{ background: C.amberL, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>No login account yet</span>
                  <button
                    type="button"
                    onClick={handleCreateStudentAccount}
                    disabled={accountActionLoading}
                    style={{
                      background: C.amber, color: C.white, border: "none", borderRadius: 6,
                      padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {accountActionLoading ? "Creating…" : "Create Account"}
                  </button>
                </div>
              )}

              {accountActionError && (
                <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginTop: 8 }}>
                  {accountActionError}
                </div>
              )}

              {resetPasswordResult && (
                <div style={{ background: C.accentL, border: `1px solid ${C.accent}40`, borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    New Credentials
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: C.slate }}>Email</span>
                    <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{resetPasswordResult.email}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.slate }}>Password</span>
                    <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{resetPasswordResult.password}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMid, marginTop: 6 }}>
                    Save this now — it won't be shown again.
                  </div>
                </div>
              )}
            </div>
          )}
          {!isEdit && (
            <>
              {sectionHeading("Tuition Fee")}

              {/* Toggle */}
              <div
                onClick={() => { setAddFee(v => !v); if (addFee) setAddPayment(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: addFee ? 14 : 20,
                  cursor: "pointer", userSelect: "none",
                }}
              >
                <div style={{
                  width: 40, height: 22, borderRadius: 11, position: "relative",
                  background: addFee ? C.accent : C.border, transition: "background 0.2s",
                  flexShrink: 0,
                }}>
                  <div style={{
                    position: "absolute", top: 3, left: addFee ? 21 : 3,
                    width: 16, height: 16, borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  Create tuition invoice for this student
                </span>
              </div>

              {addFee && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Fee Description</label>
                    <input value={feeDescription} onChange={e => setFeeDesc(e.target.value)} placeholder="e.g. Annual Tuition Fee" style={inputStyle} />
                  </div>

                  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Total Amount ($)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={feeAmount}
                        onChange={e => { setFeeAmount(e.target.value); if (addPayment) setPayAmount(e.target.value); }}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Due Date</label>
                      <input type="date" value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} style={inputStyle} />
                    </div>
                  </div>

                  {/* ── Section 3: First Payment ── */}
                  {sectionHeading("First Payment")}

                  <div
                    onClick={() => { setAddPayment(v => !v); if (!addPayment) setPayAmount(feeAmount); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      marginBottom: addPayment ? 14 : 20, cursor: "pointer", userSelect: "none",
                    }}
                  >
                    <div style={{
                      width: 40, height: 22, borderRadius: 11, position: "relative",
                      background: addPayment ? C.green : C.border, transition: "background 0.2s",
                      flexShrink: 0,
                    }}>
                      <div style={{
                        position: "absolute", top: 3, left: addPayment ? 21 : 3,
                        width: 16, height: 16, borderRadius: "50%", background: "#fff",
                        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      Record a first payment now
                    </span>
                  </div>

                  {addPayment && (
                    <>
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Amount Paid ($)</label>
                          <input
                            type="number" min="0.01" step="0.01" max={feeAmount}
                            value={payAmount}
                            onChange={e => setPayAmount(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Payment Date</label>
                          <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Payment Method</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {["Cash", "Bank Transfer", "OMT", "Whish", "Check", "Other"].map(m => (
                            <button
                              key={m} type="button"
                              onClick={() => setPayNote(m)}
                              style={{
                                padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                border: `1px solid ${payNote === m ? C.green : C.border}`,
                                background: payNote === m ? C.greenL : C.white,
                                color: payNote === m ? C.green : C.textMid,
                                cursor: "pointer",
                              }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>

                      {/* Quick fill buttons */}
                      {feeAmount && Number(feeAmount) > 0 && (
                        <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: C.slate }}>Quick fill:</span>
                          {[1, 1/2, 1/3, 1/4].map((fraction, i) => {
                            const val = (Number(feeAmount) * fraction).toFixed(2);
                            const labels = ["Full", "½", "⅓", "¼"];
                            return (
                              <button key={i} type="button" onClick={() => setPayAmount(val)}
                                style={{
                                  background: C.accentL, color: C.accent, border: "none",
                                  borderRadius: 6, padding: "4px 10px", fontSize: 11,
                                  fontWeight: 600, cursor: "pointer",
                                }}
                              >
                                {labels[i]} (${Number(val).toLocaleString()})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
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
              {submitting
                ? (isEdit ? "Saving…" : "Creating…")
                : (isEdit ? "Save Changes" : "Add Student")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
