import { useState, useEffect } from "react";
import { C } from "../theme";
import { Card, Badge } from "../components/Shared";
import { api } from "../api/client";
import PayrollModal from "./PayrollModal";
import { printPayrollSlip } from "../api/payrollPrint";
import { buildPayrollWhatsAppUrl, cleanPhone } from "../api/whatsapp";

const fmt = (n) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const statusBadge = (status) => {
  if (status === "PAID")      return { color: C.green, bg: C.greenL, label: "Paid" };
  if (status === "CANCELLED") return { color: C.red,   bg: C.redL,   label: "Cancelled" };
  return { color: C.amber, bg: C.amberL, label: "Pending" };
};

export default function Payroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  const [staff, setStaff]     = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [editStaff, setEditStaff] = useState(null);
  const [lang, setLang] = useState("en");

  const fetchData = () => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get(`/payroll?month=${month}&year=${year}`),
      api.get(`/payroll/summary?month=${month}&year=${year}`),
    ])
      .then(([staffData, summaryData]) => {
        setStaff(staffData);
        setSummary(summaryData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const handleDone = () => { setEditStaff(null); fetchData(); };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Payroll</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>Manage staff salaries, bonuses, and deductions</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Language for WhatsApp messages */}
          <div style={{ display: "flex", gap: 4 }}>
            {[["en","🇬🇧"], ["ar","🇱🇧"]].map(([l, flag]) => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: "7px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: `1px solid ${lang === l ? "#25D366" : C.border}`,
                background: lang === l ? "#F0FDF4" : C.white,
                color: lang === l ? "#16A34A" : C.textMid, cursor: "pointer",
              }}>{flag}</button>
            ))}
          </div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", background: C.white,
          }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", background: C.white,
          }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <Card style={{ borderColor: C.red, background: C.redL }}>
          <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>
        </Card>
      )}

      {/* Summary cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Total Net Payroll</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{fmt(summary.net)}</div>
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Total Bonuses</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{fmt(summary.bonus)}</div>
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Total Deductions</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{fmt(summary.deduction)}</div>
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Paid / Pending</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
              <span style={{ color: C.green }}>{summary.paidCount}</span>
              {" / "}
              <span style={{ color: C.amber }}>{summary.pendingCount}</span>
              <span style={{ fontSize: 12, color: C.slate, fontWeight: 400 }}> of {summary.totalStaff}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Staff table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>Loading…</div>
        ) : staff.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>No active staff found. Add teachers or employees first.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr style={{ background: C.slateL, borderBottom: `2px solid ${C.border}` }}>
                  {["Name", "Role", "Base", "Bonus", "Deduction", "Net", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: h === "Name" ? "left" : "center", color: C.slate, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map(s => {
                  const p = s.payment;
                  const badge = p ? statusBadge(p.status) : statusBadge("PENDING");
                  const base = p ? p.baseAmount : s.baseSalary;
                  const net  = p ? p.netAmount : s.baseSalary;
                  return (
                    <tr key={s.userId} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ fontWeight: 600, color: C.text }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: C.slate }}>{s.email}</div>
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                          background: s.role === "TEACHER" ? C.greenL : C.slateL,
                          color: s.role === "TEACHER" ? C.green : C.slate,
                        }}>{s.title}</span>
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center", color: C.textMid }}>
                        {base != null ? fmt(base) : <span style={{ color: C.slate }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        {p?.bonus > 0 ? (
                          <span style={{ color: C.green, fontWeight: 600 }} title={p.bonusNote || ""}>
                            +{fmt(p.bonus)}
                          </span>
                        ) : <span style={{ color: C.slate }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        {p?.deduction > 0 ? (
                          <span style={{ color: C.red, fontWeight: 600 }} title={p.deductionNote || ""}>
                            -{fmt(p.deduction)}
                          </span>
                        ) : <span style={{ color: C.slate }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 800, color: C.text }}>
                        {net != null ? fmt(net) : <span style={{ color: C.slate, fontWeight: 400 }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <Badge color={badge.color} bg={badge.bg} label={badge.label} />
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => setEditStaff(s)} style={{
                            background: C.accentL, color: C.accent, border: "none", borderRadius: 6,
                            padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}>
                            {p ? "Edit" : "Set Salary"}
                          </button>
                          {p && (
                            <button
                              onClick={() => printPayrollSlip(s, month, year)}
                              title="Print payroll slip"
                              style={{
                                background: C.slateL, color: C.textMid, border: "none", borderRadius: 6,
                                padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >🖨️</button>
                          )}
                          {p && cleanPhone(s.phone) && (
                            <button
                              onClick={() => {
                                const url = buildPayrollWhatsAppUrl(s, month, year, lang);
                                if (url) window.open(url, "_blank");
                              }}
                              title="Send salary slip via WhatsApp"
                              style={{
                                background: "#F0FDF4", color: "#16A34A",
                                border: "1px solid #BBF7D0", borderRadius: 6,
                                padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >💬</button>
                          )}
                          {p && !cleanPhone(s.phone) && (
                            <span title="No phone number on file" style={{ fontSize: 11, color: C.slate, padding: "5px 4px" }}>📵</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ fontSize: 11, color: C.slate, textAlign: "center" }}>
        Click "Set Salary" or "Edit" to record base salary, bonuses, deductions, and mark as paid for the selected month.
      </div>

      {editStaff && (
        <PayrollModal
          staff={editStaff}
          month={month}
          year={year}
          onClose={() => setEditStaff(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
