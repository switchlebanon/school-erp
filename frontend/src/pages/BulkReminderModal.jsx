import { useState, useMemo } from "react";
import { C } from "../theme";
import { buildWhatsAppUrl, cleanPhone } from "../api/whatsapp";

const fmt = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function BulkReminderModal({ invoices, onClose }) {
  // Only invoices that are not fully paid
  const eligible = useMemo(
    () => invoices.filter(inv => inv.status !== "PAID" && Number(inv.amount) - Number(inv.totalPaid || 0) > 0),
    [invoices]
  );

  const withPhone    = eligible.filter(inv => cleanPhone(inv.student?.guardianPhone));
  const withoutPhone = eligible.filter(inv => !cleanPhone(inv.student?.guardianPhone));

  const [selected, setSelected] = useState(() => new Set(withPhone.map(inv => inv.id)));
  const [lang, setLang]         = useState("en");
  const [step, setStep]         = useState("select"); // "select" | "queue"
  const [queueIndex, setQueueIndex] = useState(0);
  const [sentIds, setSentIds]       = useState(new Set());

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === withPhone.length) setSelected(new Set());
    else setSelected(new Set(withPhone.map(inv => inv.id)));
  };

  const queue = withPhone.filter(inv => selected.has(inv.id));
  const current = queue[queueIndex];

  const handleSend = () => {
    if (!current) return;
    const url = buildWhatsAppUrl(current, lang);
    if (url) {
      window.open(url, "_blank");
      setSentIds(prev => new Set([...prev, current.id]));
    }
  };

  const handleNext = () => {
    if (queueIndex < queue.length - 1) setQueueIndex(i => i + 1);
  };
  const handlePrev = () => {
    if (queueIndex > 0) setQueueIndex(i => i - 1);
  };

  const startQueue = () => {
    if (queue.length === 0) return;
    setQueueIndex(0);
    setSentIds(new Set());
    setStep("queue");
  };

  // ── Step 2: Queue / send view ──────────────────────────────────
  if (step === "queue" && current) {
    const total     = Number(current.amount);
    const paid      = Number(current.totalPaid || 0);
    const remaining = total - paid;
    const isSent    = sentIds.has(current.id);

    return (
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, padding: 16, fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: C.white, borderRadius: 14, width: 460, maxWidth: "100%",
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(15,23,42,0.2)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Sending Reminders</div>
              <div style={{ fontSize: 12, color: C.slate }}>
                {queueIndex + 1} of {queue.length} · {sentIds.size} sent
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
          </div>

          {/* Progress bar */}
          <div style={{ padding: "0 20px", marginTop: 14 }}>
            <div style={{ background: C.slateL, borderRadius: 4, height: 6 }}>
              <div style={{
                width: `${((queueIndex + 1) / queue.length) * 100}%`,
                height: 6, borderRadius: 4, background: "#25D366", transition: "width 0.3s",
              }} />
            </div>
          </div>

          <div style={{ padding: "18px 20px" }}>
            {/* Current student card */}
            <div style={{ background: C.slateL, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{current.student?.name}</div>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
                    {current.student?.section?.gradeLevel?.name} – {current.student?.section?.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 1 }}>{current.description}</div>
                  <div style={{ fontSize: 12, color: C.green, marginTop: 6, fontWeight: 600 }}>
                    📱 {current.student?.guardianPhone}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.slate }}>Balance Due</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>{fmt(remaining)}</div>
                </div>
              </div>
            </div>

            {/* Sent confirmation */}
            {isSent && (
              <div style={{
                background: C.greenL, color: C.green, fontSize: 13, fontWeight: 600,
                padding: "10px 14px", borderRadius: 8, marginBottom: 14, textAlign: "center",
              }}>
                ✓ WhatsApp opened for this parent
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              style={{
                width: "100%", background: "#25D366", color: C.white, border: "none",
                borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 18 }}>💬</span>
              {isSent ? "Open WhatsApp Again" : "Open WhatsApp & Send"}
            </button>

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handlePrev} disabled={queueIndex === 0} style={{
                flex: 1, background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
                padding: "10px 0", fontWeight: 600, fontSize: 13,
                cursor: queueIndex === 0 ? "default" : "pointer", opacity: queueIndex === 0 ? 0.5 : 1,
              }}>← Previous</button>

              {queueIndex < queue.length - 1 ? (
                <button onClick={handleNext} style={{
                  flex: 1, background: C.accent, color: C.white, border: "none", borderRadius: 8,
                  padding: "10px 0", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>Next →</button>
              ) : (
                <button onClick={onClose} style={{
                  flex: 1, background: C.green, color: C.white, border: "none", borderRadius: 8,
                  padding: "10px 0", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>✓ Done</button>
              )}
            </div>

            <div style={{ fontSize: 11, color: C.slate, textAlign: "center", marginTop: 12 }}>
              Each click opens a new WhatsApp tab with the message ready. Press Send in WhatsApp, then come back and click "Next".
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Selection view ─────────────────────────────────────
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, padding: 16, fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, width: 540, maxWidth: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(15,23,42,0.2)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "#25D366",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>💬</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Bulk Payment Reminders</div>
              <div style={{ fontSize: 12, color: C.slate }}>{eligible.length} unpaid invoice{eligible.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        <div style={{ padding: "18px 22px" }}>

          {/* Language selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 8 }}>Message Language</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["en", "🇬🇧 English"], ["ar", "🇱🇧 Arabic (عربي)"]].map(([l, label]) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: `2px solid ${lang === l ? "#25D366" : C.border}`,
                  background: lang === l ? "#F0FDF4" : C.white,
                  color: lang === l ? "#16A34A" : C.textMid,
                  cursor: "pointer",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Select all */}
          {withPhone.length > 0 && (
            <div
              onClick={toggleAll}
              style={{
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                padding: "8px 0", marginBottom: 4, userSelect: "none",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, border: `2px solid ${C.accent}`,
                background: selected.size === withPhone.length ? C.accent : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.white,
              }}>
                {selected.size === withPhone.length ? "✓" : ""}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                Select All ({withPhone.length})
              </span>
              <span style={{ fontSize: 12, color: C.slate, marginLeft: "auto" }}>{selected.size} selected</span>
            </div>
          )}

          {/* List */}
          <div style={{ maxHeight: 280, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 14 }}>
            {withPhone.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: C.slate }}>
                No unpaid invoices with a guardian phone number.
              </div>
            )}
            {withPhone.map((inv, i) => {
              const total     = Number(inv.amount);
              const paid      = Number(inv.totalPaid || 0);
              const remaining = total - paid;
              const isChecked = selected.has(inv.id);
              return (
                <div
                  key={inv.id}
                  onClick={() => toggle(inv.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", cursor: "pointer",
                    borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                    background: isChecked ? C.accentL : C.white,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, border: `2px solid ${C.accent}`, flexShrink: 0,
                    background: isChecked ? C.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.white,
                  }}>
                    {isChecked ? "✓" : ""}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{inv.student?.name}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>
                      {inv.student?.section?.gradeLevel?.name} – {inv.student?.section?.name} · {inv.description}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: inv.status === "OVERDUE" ? C.red : C.amber }}>
                      {fmt(remaining)}
                    </div>
                    <div style={{ fontSize: 10, color: C.slate }}>{inv.status === "OVERDUE" ? "Overdue" : "Pending"}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Missing phone warning */}
          {withoutPhone.length > 0 && (
            <div style={{
              background: C.amberL, borderRadius: 8, padding: "10px 12px", marginBottom: 14,
              fontSize: 12, color: C.amber, fontWeight: 600,
            }}>
              ⚠️ {withoutPhone.length} unpaid invoice{withoutPhone.length !== 1 ? "s" : ""} skipped — no guardian phone number on file
              ({withoutPhone.slice(0, 3).map(inv => inv.student?.name).join(", ")}{withoutPhone.length > 3 ? "…" : ""})
            </div>
          )}

          {/* Action */}
          <button
            onClick={startQueue}
            disabled={selected.size === 0}
            style={{
              width: "100%", background: selected.size > 0 ? "#25D366" : C.border,
              color: C.white, border: "none", borderRadius: 8, padding: "12px 0",
              fontWeight: 700, fontSize: 14, cursor: selected.size > 0 ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>💬</span>
            Start Sending ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
