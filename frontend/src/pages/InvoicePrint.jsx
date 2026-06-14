const fmt = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—";

// Builds a self-contained HTML string for the invoice — opened in a new
// window so window.print() only prints the invoice, nothing else.
function buildInvoiceHTML(invoice) {
  const total     = Number(invoice.amount);
  const totalPaid = Number(invoice.totalPaid || 0);
  const remaining = total - totalPaid;
  const pct       = Math.min(100, Math.round((totalPaid / total) * 100));
  const isPaid    = invoice.status === "PAID";
  const isOverdue = !isPaid && remaining > 0 && new Date(invoice.dueDate) < new Date();

  const stampColor = isPaid ? "#22C55E" : isOverdue ? "#EF4444" : "#F59E0B";
  const stampText  = isPaid ? "PAID IN FULL" : isOverdue ? "OVERDUE" : "PENDING";

  const paymentRows = (invoice.payments || []).map((p, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#F1F5F9"}">
      <td style="padding:9px 12px;color:#64748B;font-weight:600">${i + 1}</td>
      <td style="padding:9px 12px;color:#475569">${fmtDate(p.paidDate)}</td>
      <td style="padding:9px 12px;font-weight:700;color:#22C55E">${fmt(p.amount)}</td>
      <td style="padding:9px 12px;color:#64748B">${p.note || "—"}</td>
    </tr>
  `).join("");

  const paymentsSection = invoice.payments?.length > 0 ? `
    <div style="margin-bottom:24px">
      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">
        Payment History
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#1B2B4B">
            <th style="padding:8px 12px;text-align:left;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase">#</th>
            <th style="padding:8px 12px;text-align:left;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase">Date</th>
            <th style="padding:8px 12px;text-align:left;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase">Amount</th>
            <th style="padding:8px 12px;text-align:left;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase">Note</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
        <tfoot>
          <tr style="background:#F1F5F9;border-top:2px solid #E2E8F0">
            <td colspan="2" style="padding:9px 12px;font-weight:700;color:#0F172A;font-size:12px">TOTAL PAID</td>
            <td style="padding:9px 12px;font-weight:800;color:#22C55E;font-size:14px">${fmt(totalPaid)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invoice #${String(invoice.id).padStart(5, "0")} — ${invoice.student?.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff;
      color: #0F172A;
      padding: 40px;
      max-width: 740px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 24px; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="text-align:right;margin-bottom:20px">
    <button onclick="window.print()" style="
      background:#1B2B4B;color:#fff;border:none;border-radius:8px;
      padding:10px 22px;font-size:14px;font-weight:600;cursor:pointer;
    ">🖨️ Print / Save as PDF</button>
  </div>

  <!-- School header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;
              margin-bottom:28px;border-bottom:2px solid #1B2B4B;padding-bottom:20px">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="width:48px;height:48px;border-radius:12px;background:#3D7EFF;
                  display:flex;align-items:center;justify-content:center;font-size:24px">🏫</div>
      <div>
        <div style="font-weight:800;font-size:20px;color:#1B2B4B;line-height:1.2">SchoolHub</div>
        <div style="font-size:12px;color:#64748B">ERP System</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:800;color:#1B2B4B">INVOICE</div>
      <div style="font-size:12px;color:#64748B;margin-top:3px">#${String(invoice.id).padStart(5, "0")}</div>
      <div style="font-size:12px;color:#64748B">Issued: ${fmtDate(invoice.createdAt)}</div>
    </div>
  </div>

  <!-- Student + Invoice info -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">
    <div>
      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Billed To</div>
      <div style="font-weight:700;font-size:16px;color:#0F172A">${invoice.student?.name}</div>
      <div style="font-size:13px;color:#475569;margin-top:2px">
        ${invoice.student?.section?.gradeLevel?.name} — Section ${invoice.student?.section?.name}
      </div>
      <div style="font-size:12px;color:#64748B;margin-top:2px">Code: ${invoice.student?.studentCode}</div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Invoice Details</div>
      <table style="font-size:13px;border-collapse:collapse">
        <tr><td style="color:#64748B;padding:2px 12px 2px 0;width:90px">Description</td><td style="font-weight:600">${invoice.description}</td></tr>
        <tr><td style="color:#64748B;padding:2px 12px 2px 0">Due Date</td><td style="font-weight:600">${fmtDate(invoice.dueDate)}</td></tr>
        <tr><td style="color:#64748B;padding:2px 12px 2px 0">Status</td>
          <td style="font-weight:700;color:${stampColor}">${invoice.status}</td></tr>
      </table>
    </div>
  </div>

  <!-- Fee summary box -->
  <div style="background:#F1F5F9;border-radius:10px;padding:18px;margin-bottom:24px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-bottom:14px">
      <div style="text-align:center;padding:4px 8px;border-right:1px solid #E2E8F0">
        <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">Total Amount</div>
        <div style="font-size:20px;font-weight:800;color:#0F172A">${fmt(total)}</div>
      </div>
      <div style="text-align:center;padding:4px 8px;border-right:1px solid #E2E8F0">
        <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">Total Paid</div>
        <div style="font-size:20px;font-weight:800;color:#22C55E">${fmt(totalPaid)}</div>
      </div>
      <div style="text-align:center;padding:4px 8px">
        <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">Balance Due</div>
        <div style="font-size:20px;font-weight:800;color:${remaining > 0 ? "#EF4444" : "#22C55E"}">${fmt(remaining)}</div>
      </div>
    </div>
    <!-- Progress bar -->
    <div style="font-size:10px;color:#64748B;display:flex;justify-content:space-between;margin-bottom:4px">
      <span>Payment progress</span><span>${pct}%</span>
    </div>
    <div style="background:#E2E8F0;border-radius:4px;height:8px;overflow:hidden">
      <div style="width:${pct}%;height:8px;border-radius:4px;background:${isPaid ? "#22C55E" : "#3D7EFF"}"></div>
    </div>
  </div>

  ${paymentsSection}

  <!-- Status stamp -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
    <div style="
      border:3px solid ${stampColor};border-radius:8px;padding:6px 20px;
      color:${stampColor};font-weight:800;font-size:20px;
      letter-spacing:0.12em;transform:rotate(-3deg);opacity:0.85;
    ">${stampText}</div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #E2E8F0;padding-top:14px;font-size:11px;
              color:#64748B;text-align:center;line-height:1.9">
    <div>Thank you for your payment. Please keep this receipt for your records.</div>
    <div>For inquiries, contact the school administration office.</div>
    <div style="margin-top:4px;font-weight:600;color:#475569">
      SchoolHub ERP &nbsp;·&nbsp; Printed ${fmtDate(new Date())}
    </div>
  </div>

</body>
</html>`;
}

export default function InvoicePrint({ invoice, onClose }) {
  const total     = Number(invoice.amount);
  const totalPaid = Number(invoice.totalPaid || 0);
  const remaining = total - totalPaid;
  const pct       = Math.min(100, Math.round((totalPaid / total) * 100));
  const isPaid    = invoice.status === "PAID";
  const isOverdue = !isPaid && remaining > 0 && new Date(invoice.dueDate) < new Date();
  const stampColor = isPaid ? "#22C55E" : isOverdue ? "#EF4444" : "#F59E0B";
  const stampText  = isPaid ? "PAID IN FULL" : isOverdue ? "OVERDUE" : "PENDING";

  const handlePrint = () => {
    const html = buildInvoiceHTML(invoice);
    const win = window.open("", "_blank", "width=800,height=900");
    win.document.write(html);
    win.document.close();
    // Small delay so fonts/layout render before print dialog opens
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, padding: 24,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 14, width: 620,
          maxWidth: "100%", maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 12px 40px rgba(15,23,42,0.22)",
        }}
      >
        {/* Preview inside the modal */}
        <div style={{ padding: "28px 32px" }}>

          {/* School header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "2px solid #1B2B4B", paddingBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#3D7EFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏫</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#1B2B4B" }}>SchoolHub</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>ERP System</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1B2B4B" }}>INVOICE</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>#{String(invoice.id).padStart(5, "0")}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>Issued: {fmtDate(invoice.createdAt)}</div>
            </div>
          </div>

          {/* Student + Invoice info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Billed To</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{invoice.student?.name}</div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{invoice.student?.section?.gradeLevel?.name} — Section {invoice.student?.section?.name}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Code: {invoice.student?.studentCode}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Invoice Details</div>
              {[["Description", invoice.description], ["Due Date", fmtDate(invoice.dueDate)], ["Status", invoice.status]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 3 }}>
                  <span style={{ color: "#64748B", width: 90, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontWeight: 600, color: k === "Status" ? stampColor : "#0F172A" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary box */}
          <div style={{ background: "#F1F5F9", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 12 }}>
              {[["Total Amount", fmt(total), "#0F172A"], ["Total Paid", fmt(totalPaid), "#22C55E"], ["Balance Due", fmt(remaining), remaining > 0 ? "#EF4444" : "#22C55E"]].map(([l, v, c], i) => (
                <div key={l} style={{ textAlign: "center", padding: "4px 8px", borderRight: i < 2 ? "1px solid #E2E8F0" : "none" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748B", marginBottom: 4 }}>
              <span>Payment progress</span><span>{pct}%</span>
            </div>
            <div style={{ background: "#E2E8F0", borderRadius: 4, height: 7 }}>
              <div style={{ width: `${pct}%`, height: 7, borderRadius: 4, background: isPaid ? "#22C55E" : "#3D7EFF" }} />
            </div>
          </div>

          {/* Payment history */}
          {invoice.payments?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Payment History</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#1B2B4B" }}>
                    {["#", "Date", "Amount", "Note"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #E2E8F0", background: i % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                      <td style={{ padding: "8px 10px", color: "#64748B", fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>{fmtDate(p.paidDate)}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#22C55E" }}>{fmt(p.amount)}</td>
                      <td style={{ padding: "8px 10px", color: "#64748B" }}>{p.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#F1F5F9", borderTop: "2px solid #E2E8F0" }}>
                    <td colSpan={2} style={{ padding: "8px 10px", fontWeight: 700, color: "#0F172A", fontSize: 11 }}>TOTAL PAID</td>
                    <td style={{ padding: "8px 10px", fontWeight: 800, color: "#22C55E", fontSize: 13 }}>{fmt(totalPaid)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Stamp */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
            <div style={{ border: `3px solid ${stampColor}`, borderRadius: 8, padding: "5px 16px", color: stampColor, fontWeight: 800, fontSize: 17, letterSpacing: "0.1em", transform: "rotate(-3deg)", opacity: 0.85 }}>
              {stampText}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12, fontSize: 11, color: "#64748B", textAlign: "center", lineHeight: 1.8 }}>
            <div>Thank you for your payment. Please keep this receipt for your records.</div>
            <div>SchoolHub ERP · Printed {fmtDate(new Date())}</div>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 28px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC", borderRadius: "0 0 14px 14px" }}>
          <button onClick={onClose} style={{ background: "#fff", color: "#475569", border: "1px solid #E2E8F0", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Close
          </button>
          <button onClick={handlePrint} style={{ background: "#1B2B4B", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
