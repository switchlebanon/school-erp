import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { C } from "../theme";
import { Badge, Card, SectionTitle } from "../components/Shared";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import RecordPaymentModal from "./RecordPaymentModal";
import NewInvoiceModal from "./NewInvoiceModal";
import InvoicePrint from "./InvoicePrint";
import WhatsAppReminderModal from "./WhatsAppReminderModal";
import BulkReminderModal from "./BulkReminderModal";

const statusStyle = (s) =>
  s === "PAID"    ? { color: C.green, bg: C.greenL } :
  s === "PENDING" ? { color: C.amber, bg: C.amberL } :
                    { color: C.red,   bg: C.redL   };

const fmt = (n) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });

function PaymentProgress({ invoice }) {
  const total     = Number(invoice.amount);
  const paid      = Number(invoice.totalPaid || 0);
  const pct       = Math.min(100, Math.round((paid / total) * 100));
  const remaining = total - paid;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMid, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: C.text }}>{fmt(total)}</span>
        <span style={{ color: paid >= total ? C.green : C.slate }}>
          {paid > 0 ? `${fmt(paid)} paid` : "Not paid"}
        </span>
      </div>
      <div style={{ background: C.slateL, borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 4,
          background: pct >= 100 ? C.green : pct > 0 ? C.accent : C.border,
          transition: "width 0.3s",
        }} />
      </div>
      {paid > 0 && paid < total && (
        <div style={{ fontSize: 10, color: C.amber, marginTop: 2, fontWeight: 600 }}>
          {fmt(remaining)} remaining · {invoice.payments?.length || 0} installment{invoice.payments?.length !== 1 ? "s" : ""}
        </div>
      )}
      {paid >= total && (
        <div style={{ fontSize: 10, color: C.green, marginTop: 2, fontWeight: 600 }}>
          {invoice.payments?.length || 0} installment{invoice.payments?.length !== 1 ? "s" : ""} · Fully paid
        </div>
      )}
    </div>
  );
}

export default function Fees() {
  const { user } = useAuth();
  const isParent = user?.role === "PARENT";
  const isAdmin  = user?.role === "ADMIN";
  const [invoices, setInvoices]             = useState([]);
  const [summary, setSummary]               = useState({ collected: 0, pending: 0, overdue: 0 });
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [filter, setFilter]                 = useState("ALL");
  const [search, setSearch]                 = useState("");
  const [payingInvoice, setPayingInvoice]       = useState(null);
  const [printInvoice, setPrintInvoice]         = useState(null);
  const [whatsappInvoice, setWhatsappInvoice]   = useState(null);
  const [showNewInvoice, setShowNewInvoice]     = useState(false);
  const [showBulkReminder, setShowBulkReminder] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([api.get("/fees"), api.get("/fees/summary")])
      .then(([inv, sum]) => { setInvoices(inv); setSummary(sum); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = invoices.filter(inv => {
    const matchStatus = filter === "ALL" || inv.status === filter;
    const matchSearch = !search ||
      inv.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      inv.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const monthlyMap = {};
  invoices.forEach(inv => {
    const d = new Date(inv.dueDate);
    const m = d.toLocaleString("default", { month: "short" });
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, monthIdx: d.getMonth(), collected: 0, pending: 0 };
    if (inv.status === "PAID") monthlyMap[m].collected += Number(inv.totalPaid || 0);
    else                        monthlyMap[m].pending   += Number(inv.amount    || 0);
  });
  const chartData = Object.values(monthlyMap).sort((a, b) => a.monthIdx - b.monthIdx).slice(-6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Fees & Finance</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>Academic Year 2025–2026</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isAdmin && (
            <button
              onClick={() => setShowBulkReminder(true)}
              style={{
                background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0",
                borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              💬 Bulk Reminders
            </button>
          )}
          {!isParent && (
            <button
              onClick={() => setShowNewInvoice(true)}
              style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              + New Invoice
            </button>
          )}
        </div>
      </div>

      {error && (
        <Card style={{ borderColor: C.red, background: C.redL }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>
        </Card>
      )}

      {/* Summary cards */}
      {isParent ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            ["Total Fees",   fmt(invoices.reduce((s, i) => s + Number(i.amount || 0), 0)),    C.accent],
            ["Paid",         fmt(invoices.reduce((s, i) => s + Number(i.totalPaid || 0), 0)), C.green],
            ["Balance Due",  fmt(invoices.reduce((s, i) => s + Math.max(0, Number(i.amount || 0) - Number(i.totalPaid || 0)), 0)), C.amber],
          ].map(([l, v, c]) => (
            <Card key={l} style={{ borderLeft: `4px solid ${c}`, padding: 14 }}>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            ["Total Collected", fmt(summary.collected), C.green],
            ["Pending",         fmt(summary.pending),   C.amber],
            ["Overdue",         fmt(summary.overdue),   C.red],
          ].map(([l, v, c]) => (
            <Card key={l} style={{ borderLeft: `4px solid ${c}`, padding: 14 }}>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Chart — admin only */}
      {!isParent && chartData.length > 0 && (
        <Card style={{ padding: 18 }}>
          <SectionTitle>Monthly Fee Collection</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.slate }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} width={40} />
              <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
              <Line dataKey="collected" stroke={C.green} strokeWidth={2.5} dot={{ r: 4, fill: C.green }} name="Collected" />
              <Line dataKey="pending"   stroke={C.amber} strokeWidth={2.5} dot={{ r: 4, fill: C.amber }} name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Invoices table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          {!isParent && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student or description…"
              style={{
                flex: 1, minWidth: 180, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "7px 12px", fontSize: 13, outline: "none",
              }}
            />
          )}
          {["ALL", "PAID", "PENDING", "OVERDUE"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
              background: filter === f ? C.accentL : C.white,
              color: filter === f ? C.accent : C.textMid,
              cursor: "pointer",
            }}>
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>Loading invoices…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr style={{ background: C.slateL, borderBottom: `2px solid ${C.border}` }}>
                  {(isParent
                    ? ["Child", "Description", "Amount & Progress", "Due Date", "Status", ""]
                    : ["Student", "Description", "Amount & Progress", "Due Date", "Status", "Actions"]
                  ).map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: C.slate, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: C.text }}>{inv.student?.name}</div>
                      <div style={{ fontSize: 11, color: C.slate }}>
                        {inv.student?.section?.gradeLevel?.name} – {inv.student?.section?.name}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", color: C.textMid }}>{inv.description}</td>
                    <td style={{ padding: "12px 14px", minWidth: 160 }}>
                      <PaymentProgress invoice={inv} />
                    </td>
                    <td style={{ padding: "12px 14px", color: C.textMid, whiteSpace: "nowrap" }}>
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge {...statusStyle(inv.status)} label={inv.status.charAt(0) + inv.status.slice(1).toLowerCase()} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {/* Pay / View button — hidden for parents */}
                        {!isParent && (
                          <button
                            onClick={() => setPayingInvoice(inv)}
                            style={{
                              background: inv.status === "PAID" ? C.slateL : C.greenL,
                              color:      inv.status === "PAID" ? C.slate   : C.green,
                              border: "none", borderRadius: 6, padding: "5px 10px",
                              fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            {inv.status === "PAID" ? "View" : "Pay"}
                          </button>
                        )}
                        {/* WhatsApp reminder — admin only */}
                        {!isParent && inv.status !== "PAID" && (
                          <button
                            onClick={() => setWhatsappInvoice(inv)}
                            title="Send WhatsApp reminder to parent"
                            style={{
                              background: "#F0FDF4", color: "#16A34A",
                              border: "1px solid #BBF7D0", borderRadius: 6,
                              padding: "5px 10px", fontSize: 11, fontWeight: 600,
                              cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            💬 Remind
                          </button>
                        )}
                        {/* Print button — always visible */}
                        <button
                          onClick={() => setPrintInvoice(inv)}
                          style={{
                            background: C.accentL, color: C.accent,
                            border: "none", borderRadius: 6, padding: "5px 10px",
                            fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                          }}
                        >
                          🖨️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.slate }}>No invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      {payingInvoice && (
        <RecordPaymentModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onDone={(updated) => {
            setPayingInvoice(null);
            fetchAll();
            // Auto-open print after payment if something was actually paid
            if (updated) setPrintInvoice(updated);
          }}
        />
      )}
      {showNewInvoice && (
        <NewInvoiceModal
          onClose={() => setShowNewInvoice(false)}
          onDone={() => { setShowNewInvoice(false); fetchAll(); }}
        />
      )}
      {whatsappInvoice && (
        <WhatsAppReminderModal
          invoice={whatsappInvoice}
          onClose={() => setWhatsappInvoice(null)}
        />
      )}
      {printInvoice && (
        <InvoicePrint
          invoice={printInvoice}
          onClose={() => setPrintInvoice(null)}
        />
      )}
      {showBulkReminder && (
        <BulkReminderModal
          invoices={invoices}
          onClose={() => setShowBulkReminder(false)}
        />
      )}
    </div>
  );
}
