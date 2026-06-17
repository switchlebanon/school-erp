import { useState, useEffect } from "react";
import { C } from "../theme";
import { Card, Badge } from "../components/Shared";
import { api } from "../api/client";
import ExpenseModal, { CATEGORY_LABELS, CATEGORY_COLORS } from "./ExpenseModal";

const fmt = (n) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const statusBadge = (status) => {
  if (status === "PAID")      return { color: C.green, bg: C.greenL, label: "Paid" };
  if (status === "CANCELLED") return { color: C.red,   bg: C.redL,   label: "Cancelled" };
  return { color: C.amber, bg: C.amberL, label: "Pending" };
};

export default function Expenses() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError("");
    const params = `month=${month}&year=${year}${categoryFilter !== "ALL" ? `&category=${categoryFilter}` : ""}`;
    Promise.all([
      api.get(`/expenses?${params}`),
      api.get(`/expenses/summary?month=${month}&year=${year}`),
    ])
      .then(([expensesData, summaryData]) => {
        setExpenses(expensesData);
        setSummary(summaryData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [month, year, categoryFilter]);

  const openAdd  = () => { setEditExpense(null); setShowModal(true); };
  const openEdit = (e) => { setEditExpense(e); setShowModal(true); };
  const handleDone = () => { setShowModal(false); setEditExpense(null); fetchData(); };

  const handleDelete = async (e) => {
    if (!window.confirm(`Delete expense "${e.description}"?`)) return;
    try {
      await api.delete(`/expenses/${e.id}`);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to delete expense");
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>Expenses</h2>
          <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>Track operating costs — utilities, supplies, maintenance, and more</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          <button onClick={openAdd} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            + Add Expense
          </button>
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
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Total Expenses</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{fmt(summary.total)}</div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{summary.count} entries</div>
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Paid</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{fmt(summary.paid)}</div>
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Pending</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.amber }}>{fmt(summary.pending)}</div>
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Top Category</div>
            {summary.byCategory.length > 0 ? (
              (() => {
                const top = [...summary.byCategory].sort((a, b) => b.amount - a.amount)[0];
                return (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 800, color: CATEGORY_COLORS[top.category] }}>{CATEGORY_LABELS[top.category]}</div>
                    <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{fmt(top.amount)}</div>
                  </>
                );
              })()
            ) : <div style={{ fontSize: 13, color: C.slate }}>—</div>}
          </Card>
        </div>
      )}

      {/* Category filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => setCategoryFilter("ALL")} style={{
          padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: `1px solid ${categoryFilter === "ALL" ? C.accent : C.border}`,
          background: categoryFilter === "ALL" ? C.accentL : C.white,
          color: categoryFilter === "ALL" ? C.accent : C.textMid,
          cursor: "pointer",
        }}>All Categories</button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setCategoryFilter(key)} style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: `1px solid ${categoryFilter === key ? CATEGORY_COLORS[key] : C.border}`,
            background: categoryFilter === key ? CATEGORY_COLORS[key] + "1A" : C.white,
            color: categoryFilter === key ? CATEGORY_COLORS[key] : C.textMid,
            cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {/* Expenses table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>Loading…</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: C.slate, fontSize: 13 }}>No expenses recorded for this period.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr style={{ background: C.slateL, borderBottom: `2px solid ${C.border}` }}>
                  {["Date", "Description", "Category", "Vendor", "Amount", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: h === "Amount" || h === "Status" || h === "" ? "center" : "left", color: C.slate, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => {
                  const badge = statusBadge(e.status);
                  return (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "11px 14px", color: C.textMid, whiteSpace: "nowrap" }}>{fmtDate(e.expenseDate)}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ fontWeight: 600, color: C.text }}>{e.description}</div>
                        {e.note && <div style={{ fontSize: 11, color: C.slate }}>{e.note}</div>}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                          background: CATEGORY_COLORS[e.category] + "1A", color: CATEGORY_COLORS[e.category],
                        }}>{CATEGORY_LABELS[e.category]}</span>
                      </td>
                      <td style={{ padding: "11px 14px", color: C.textMid }}>{e.vendor || "—"}</td>
                      <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 700, color: C.text }}>{fmt(e.amount)}</td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <Badge color={badge.color} bg={badge.bg} label={badge.label} />
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => openEdit(e)} style={{
                            background: C.accentL, color: C.accent, border: "none", borderRadius: 6,
                            padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}>Edit</button>
                          <button onClick={() => handleDelete(e)} style={{
                            background: C.redL, color: C.red, border: "none", borderRadius: 6,
                            padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}>Delete</button>
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

      {showModal && (
        <ExpenseModal
          expense={editExpense}
          onClose={() => { setShowModal(false); setEditExpense(null); }}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
