import { useState } from "react";
import { C } from "../theme";
import { api } from "../api/client";

const fmt = (n) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RecordPaymentModal({ invoice, onClose, onDone }) {
  const totalDue   = Number(invoice.amount);
  const totalPaid  = Number(invoice.totalPaid || 0);
  const remaining  = totalDue - totalPaid;
  const pctPaid    = Math.min(100, Math.round((totalPaid / totalDue) * 100));

  const [amount, setAmount] = useState(String(remaining.toFixed(2)));
  const [note, setNote]     = useState("");
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const val = Number(amount);
    if (!val || val <= 0)          { setError("Please enter a valid amount."); return; }
    if (val > remaining + 0.001)   { setError(`Maximum payable is ${fmt(remaining)}.`); return; }

    setSaving(true);
    try {
      const updated = await api.post(`/fees/${invoice.id}/pay`, {
        amount: val,
        note: note.trim() || undefined,
      });
      onDone(updated);
    } catch (err) {
      setError(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, padding: 24, width: 440,
        maxWidth: "100%", boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>Record Payment</h2>
            <p style={{ fontSize: 12, color: C.slate, margin: "3px 0 0" }}>{invoice.student?.name} — {invoice.description}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMid, marginBottom: 6 }}>
            <span>Paid: <b style={{ color: C.green }}>{fmt(totalPaid)}</b></span>
            <span>Remaining: <b style={{ color: remaining > 0 ? C.red : C.green }}>{fmt(remaining)}</b></span>
            <span>Total: <b style={{ color: C.text }}>{fmt(totalDue)}</b></span>
          </div>
          <div style={{ background: C.slateL, borderRadius: 6, height: 10, overflow: "hidden" }}>
            <div style={{
              width: `${pctPaid}%`, height: "100%", borderRadius: 6,
              background: pctPaid >= 100 ? C.green : C.accent,
              transition: "width 0.3s",
            }} />
          </div>
          <div style={{ fontSize: 11, color: C.slate, marginTop: 4, textAlign: "right" }}>{pctPaid}% paid</div>
        </div>

        {/* Payment history */}
        {invoice.payments?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              Payment History
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {invoice.payments.map((p, i) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", background: C.slateL, borderRadius: 8,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: C.greenL,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: C.green, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(p.amount)}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>
                      {new Date(p.paidDate).toLocaleDateString()}
                      {p.note && ` · ${p.note}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✓</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already fully paid */}
        {remaining <= 0 ? (
          <div style={{ background: C.greenL, color: C.green, fontSize: 13, fontWeight: 600, padding: "12px 16px", borderRadius: 10, textAlign: "center" }}>
            ✓ This invoice is fully paid
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              New Installment
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Amount ($)</label>
                <input
                  type="number" min="0.01" step="0.01" max={remaining}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{
                    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "9px 12px", fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Note (optional)</label>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Cash, OMT, Bank…"
                  style={{
                    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Quick-fill buttons */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: C.slate, alignSelf: "center" }}>Quick fill:</span>
              {[remaining, remaining / 2, remaining / 3].filter(v => v > 0).map((v, i) => (
                <button
                  key={i} type="button"
                  onClick={() => setAmount(v.toFixed(2))}
                  style={{
                    background: C.accentL, color: C.accent, border: "none", borderRadius: 6,
                    padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {i === 0 ? "Full" : i === 1 ? "½" : "⅓"} ({fmt(v)})
                </button>
              ))}
            </div>

            {error && (
              <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
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
                padding: "9px 18px", fontWeight: 600, fontSize: 13,
                cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Saving…" : "Record Installment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
