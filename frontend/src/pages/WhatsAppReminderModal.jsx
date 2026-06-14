import { useState } from "react";
import { C } from "../theme";
import { buildWhatsAppUrl } from "../api/whatsapp";

const fmt = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WhatsAppReminderModal({ invoice, onClose }) {
  const [lang, setLang] = useState("en");

  const phone     = invoice.student?.guardianPhone;
  const total     = Number(invoice.amount);
  const paid      = Number(invoice.totalPaid || 0);
  const remaining = total - paid;
  const waUrl     = buildWhatsAppUrl(invoice, lang);

  const handleSend = () => {
    if (waUrl) window.open(waUrl, "_blank");
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, padding: 16,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, width: 460,
        maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 12px 40px rgba(15,23,42,0.2)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#25D366", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 20,
            }}>💬</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>WhatsApp Reminder</div>
              <div style={{ fontSize: 12, color: C.slate }}>Send payment reminder to parent</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        <div style={{ padding: "18px 22px" }}>

          {/* Student / Invoice summary */}
          <div style={{ background: C.slateL, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{invoice.student?.name}</div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
                  {invoice.student?.section?.gradeLevel?.name} – {invoice.student?.section?.name}
                </div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 1 }}>{invoice.description}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: C.slate }}>Balance Due</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: remaining > 0 ? C.red : C.green }}>
                  {fmt(remaining)}
                </div>
              </div>
            </div>
          </div>

          {/* Guardian phone */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 6 }}>Guardian WhatsApp Number</div>
            {phone ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", border: `1px solid ${C.green}`,
                borderRadius: 8, background: C.greenL,
              }}>
                <span style={{ fontSize: 16 }}>📱</span>
                <span style={{ fontWeight: 600, color: C.green, fontSize: 13 }}>{phone}</span>
                <span style={{ fontSize: 11, color: C.green, marginLeft: "auto" }}>✓ Ready to send</span>
              </div>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", border: `1px solid ${C.amber}`,
                borderRadius: 8, background: C.amberL,
              }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>No phone number on file</div>
                  <div style={{ fontSize: 11, color: C.amber }}>Edit the student record to add a guardian WhatsApp number.</div>
                </div>
              </div>
            )}
          </div>

          {/* Language selector */}
          <div style={{ marginBottom: 16 }}>
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

          {/* Message preview */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 8 }}>Message Preview</div>
            <div style={{
              background: "#ECF8F1", border: `1px solid #D1FAE5`,
              borderRadius: 10, padding: "12px 14px",
              fontSize: 12.5, color: "#1A1A1A", lineHeight: 1.7,
              whiteSpace: "pre-wrap", direction: lang === "ar" ? "rtl" : "ltr",
              fontFamily: lang === "ar" ? "'Segoe UI', Tahoma, sans-serif" : "inherit",
              maxHeight: 220, overflowY: "auto",
            }}>
              {/* Render the raw message text for preview */}
              {buildWhatsAppUrl(invoice, lang)
                ? decodeURIComponent(buildWhatsAppUrl(invoice, lang).split("?text=")[1])
                : "No message available"}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, background: C.slateL, color: C.textMid, border: "none",
              borderRadius: 8, padding: "10px 0", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Cancel</button>
            <button
              onClick={handleSend}
              disabled={!phone}
              style={{
                flex: 2, background: phone ? "#25D366" : C.border,
                color: C.white, border: "none", borderRadius: 8,
                padding: "10px 0", fontWeight: 700, fontSize: 14,
                cursor: phone ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>💬</span>
              Open in WhatsApp
            </button>
          </div>

          {phone && (
            <div style={{ fontSize: 11, color: C.slate, textAlign: "center", marginTop: 10 }}>
              WhatsApp will open in a new tab with the message pre-filled. Just press Send.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
