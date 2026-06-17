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

export const CATEGORY_LABELS = {
  UTILITIES: "Utilities",
  SUPPLIES: "Supplies",
  MAINTENANCE: "Maintenance",
  RENT: "Rent",
  TRANSPORTATION: "Transportation",
  EQUIPMENT: "Equipment",
  MARKETING: "Marketing",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

export const CATEGORY_COLORS = {
  UTILITIES: "#3D7EFF",
  SUPPLIES: "#22C55E",
  MAINTENANCE: "#F59E0B",
  RENT: "#A855F7",
  TRANSPORTATION: "#06B6D4",
  EQUIPMENT: "#64748B",
  MARKETING: "#EC4899",
  INSURANCE: "#14B8A6",
  OTHER: "#94A3B8",
};

// Used for both Add and Edit. If `expense` is passed -> Edit mode.
export default function ExpenseModal({ onClose, onDone, expense }) {
  const isEdit = Boolean(expense);

  const [category, setCategory]       = useState(expense?.category || "OTHER");
  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount]            = useState(expense?.amount != null ? String(expense.amount) : "");
  const [vendor, setVendor]            = useState(expense?.vendor || "");
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod || "Cash");
  const [status, setStatus]            = useState(expense?.status || "PENDING");
  const [expenseDate, setExpenseDate]  = useState(
    expense?.expenseDate ? expense.expenseDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(expense?.note || "");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!description.trim()) { setError("Description is required."); return; }
    if (amount === "" || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (!expenseDate) { setError("Please select a date."); return; }

    setSaving(true);
    try {
      const payload = {
        category,
        description: description.trim(),
        amount: Number(amount),
        vendor: vendor.trim() || undefined,
        paymentMethod: paymentMethod.trim() || undefined,
        status,
        expenseDate,
        note: note.trim() || undefined,
      };

      if (isEdit) {
        await api.put(`/expenses/${expense.id}`, payload);
      } else {
        await api.post("/expenses", payload);
      }
      onDone();
    } catch (err) {
      setError(err.message || "Failed to save expense");
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>
            {isEdit ? "Edit Expense" : "Add Expense"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate, padding: 4 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Electricity bill - June" style={inputStyle} />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Amount ($)</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 250" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date</label>
              <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Vendor / Payee (optional)</label>
              <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. EDL" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Payment Method</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Cash", "Bank Transfer", "Check", "OMT", "Other"].map(m => (
                <button
                  key={m} type="button"
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${paymentMethod === m ? C.accent : C.border}`,
                    background: paymentMethod === m ? C.accentL : C.white,
                    color: paymentMethod === m ? C.accent : C.textMid,
                    cursor: "pointer",
                  }}
                >{m}</button>
              ))}
            </div>
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
                    cursor: "pointer",
                  }}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Any additional details…" style={inputStyle} />
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
              background: isEdit ? C.green : C.accent, color: C.white, border: "none", borderRadius: 8,
              padding: "9px 20px", fontWeight: 600, fontSize: 13,
              cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
