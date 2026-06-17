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

const fmt = (n) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayrollModal({ staff, month, year, onClose, onDone }) {
  const existing = staff.payment;

  const [baseAmount, setBaseAmount] = useState(
    existing ? String(existing.baseAmount) : (staff.baseSalary != null ? String(staff.baseSalary) : "")
  );
  const [bonus, setBonus]         = useState(existing ? String(existing.bonus) : "0");
  const [bonusNote, setBonusNote] = useState(existing?.bonusNote || "");
  const [deduction, setDeduction] = useState(existing ? String(existing.deduction) : "0");
  const [deductionNote, setDeductionNote] = useState(existing?.deductionNote || "");
  const [status, setStatus]       = useState(existing?.status || "PENDING");
  const [note, setNote]           = useState(existing?.note || "");

  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);

  const net = (Number(baseAmount) || 0) + (Number(bonus) || 0) - (Number(deduction) || 0);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (baseAmount === "" || Number(baseAmount) < 0) {
      setError("Please enter a valid base salary amount.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/payroll", {
        userId: staff.userId,
        month, year,
        baseAmount: Number(baseAmount),
        bonus: Number(bonus) || 0,
        bonusNote: bonusNote.trim() || undefined,
        deduction: Number(deduction) || 0,
        deductionNote: deductionNote.trim() || undefined,
        status,
        note: note.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err.message || "Failed to save payroll entry");
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
        background: C.white, borderRadius: 14, padding: 24, width: 460,
        maxWidth: "100%", maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>{staff.name}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate, padding: 4 }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: C.slate, margin: "2px 0 18px" }}>
          {staff.title} · {monthNames[month - 1]} {year}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Base Salary ($)</label>
            <input
              type="number" min="0" step="0.01"
              value={baseAmount}
              onChange={e => setBaseAmount(e.target.value)}
              placeholder="e.g. 800"
              style={inputStyle}
            />
          </div>

          {/* Bonus */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Bonus ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={bonus}
                onChange={e => setBonus(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1.4 }}>
              <label style={labelStyle}>Bonus Reason (optional)</label>
              <input
                value={bonusNote}
                onChange={e => setBonusNote(e.target.value)}
                placeholder="e.g. Eid bonus, overtime"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Deduction */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Deduction ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={deduction}
                onChange={e => setDeduction(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1.4 }}>
              <label style={labelStyle}>Deduction Reason (optional)</label>
              <input
                value={deductionNote}
                onChange={e => setDeductionNote(e.target.value)}
                placeholder="e.g. Unpaid leave, advance"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Net total */}
          <div style={{ background: C.slateL, borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>Net Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: net >= 0 ? C.green : C.red }}>{fmt(net)}</span>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[["PENDING", C.amber, C.amberL], ["PAID", C.green, C.greenL], ["CANCELLED", C.red, C.redL]].map(([s, color, bg]) => (
                <button
                  key={s} type="button"
                  onClick={() => setStatus(s)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${status === s ? color : C.border}`,
                    background: status === s ? bg : C.white,
                    color: status === s ? color : C.textMid,
                    cursor: "pointer", textTransform: "capitalize",
                  }}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Any additional notes…" style={inputStyle} />
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
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
