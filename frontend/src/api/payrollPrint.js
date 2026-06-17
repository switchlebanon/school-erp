const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const fmt = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const today = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

export function printPayrollSlip(staff, month, year) {
  const p = staff.payment;
  if (!p) return;

  const monthName = MONTHS[month - 1];
  const net = Number(p.netAmount);
  const base = Number(p.baseAmount);
  const bonus = Number(p.bonus);
  const deduction = Number(p.deduction);

  const statusColor = p.status === "PAID" ? "#22C55E" : p.status === "CANCELLED" ? "#EF4444" : "#F59E0B";
  const statusText  = p.status === "PAID" ? "PAID" : p.status === "CANCELLED" ? "CANCELLED" : "PENDING";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Payroll Slip — ${staff.name} — ${monthName} ${year}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff;
      color: #0F172A;
      padding: 40px;
      max-width: 680px;
      margin: 0 auto;
      font-size: 13px;
    }
    @media print {
      body { padding: 24px; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; size: A4; }
    }

    .print-btn {
      text-align: right;
      margin-bottom: 24px;
    }
    .print-btn button {
      background: #1B2B4B; color: #fff; border: none; border-radius: 8px;
      padding: 10px 22px; font-size: 14px; font-weight: 600; cursor: pointer;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #1B2B4B;
      margin-bottom: 28px;
    }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon {
      width: 46px; height: 46px; border-radius: 12px;
      background: #3D7EFF; display: flex; align-items: center;
      justify-content: center; font-size: 22px;
    }
    .logo-name { font-weight: 800; font-size: 20px; color: #1B2B4B; line-height: 1.2; }
    .logo-sub  { font-size: 11px; color: #64748B; }
    .slip-title { text-align: right; }
    .slip-title h1 { font-size: 22px; font-weight: 800; color: #1B2B4B; }
    .slip-title p  { font-size: 12px; color: #64748B; margin-top: 4px; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .info-block label { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.07em; display: block; margin-bottom: 8px; }
    .info-row { display: flex; gap: 8px; font-size: 13px; margin-bottom: 4px; }
    .info-row .k { color: #64748B; width: 110px; flex-shrink: 0; }
    .info-row .v { font-weight: 600; color: #0F172A; }

    .breakdown {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 28px;
    }
    .breakdown-header {
      background: #1B2B4B;
      padding: 10px 16px;
      font-size: 11px; font-weight: 700; color: #7B93BE;
      text-transform: uppercase; letter-spacing: 0.07em;
    }
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 11px 16px;
      border-top: 1px solid #E2E8F0;
    }
    .breakdown-row:first-of-type { border-top: none; }
    .breakdown-row .label { font-size: 13px; color: #475569; }
    .breakdown-row .label small { display: block; font-size: 11px; color: #94A3B8; margin-top: 2px; }
    .breakdown-row .amount { font-size: 14px; font-weight: 700; }
    .breakdown-row.positive .amount { color: #22C55E; }
    .breakdown-row.negative .amount { color: #EF4444; }
    .breakdown-row.neutral  .amount { color: #0F172A; }
    .breakdown-row.total {
      background: #F1F5F9;
      border-top: 2px solid #E2E8F0;
    }
    .breakdown-row.total .label { font-weight: 700; font-size: 14px; color: #0F172A; }
    .breakdown-row.total .amount { font-size: 20px; font-weight: 800; color: #0F172A; }

    .status-stamp {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .stamp {
      border: 3px solid ${statusColor};
      border-radius: 8px;
      padding: 6px 20px;
      color: ${statusColor};
      font-weight: 800;
      font-size: 20px;
      letter-spacing: 0.12em;
      transform: rotate(-3deg);
      opacity: 0.85;
    }

    .footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
      font-size: 11px;
      color: #64748B;
      text-align: center;
      line-height: 1.9;
    }

    .sig-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin: 32px 0 8px;
    }
    .sig-box {
      border-top: 1px solid #CBD5E1;
      padding-top: 8px;
      font-size: 11px;
      color: #64748B;
      text-align: center;
    }
  </style>
</head>
<body>

  <div class="print-btn no-print">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <!-- Header -->
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🏫</div>
      <div>
        <div class="logo-name">S³</div>
        <div class="logo-sub">ERP System</div>
      </div>
    </div>
    <div class="slip-title">
      <h1>PAYROLL SLIP</h1>
      <p>${monthName} ${year}</p>
    </div>
  </div>

  <!-- Info grid -->
  <div class="info-grid">
    <div>
      <label>Employee Details</label>
      <div class="info-row"><span class="k">Name</span><span class="v">${staff.name}</span></div>
      <div class="info-row"><span class="k">Email</span><span class="v">${staff.email}</span></div>
      <div class="info-row"><span class="k">Role</span><span class="v">${staff.title}</span></div>
    </div>
    <div>
      <label>Payment Details</label>
      <div class="info-row"><span class="k">Pay Period</span><span class="v">${monthName} ${year}</span></div>
      <div class="info-row"><span class="k">Status</span><span class="v" style="color:${statusColor};font-weight:700">${statusText}</span></div>
      ${p.paidDate ? `<div class="info-row"><span class="k">Paid On</span><span class="v">${fmtDate(p.paidDate)}</span></div>` : ""}
    </div>
  </div>

  <!-- Breakdown -->
  <div class="breakdown">
    <div class="breakdown-header">Salary Breakdown</div>
    <div class="breakdown-row neutral">
      <div class="label">Base Salary</div>
      <div class="amount">${fmt(base)}</div>
    </div>
    <div class="breakdown-row positive">
      <div class="label">
        Bonus
        ${p.bonusNote ? `<small>${p.bonusNote}</small>` : ""}
      </div>
      <div class="amount">+ ${fmt(bonus)}</div>
    </div>
    <div class="breakdown-row negative">
      <div class="label">
        Deduction
        ${p.deductionNote ? `<small>${p.deductionNote}</small>` : ""}
      </div>
      <div class="amount">− ${fmt(deduction)}</div>
    </div>
    <div class="breakdown-row total">
      <div class="label">Net Salary</div>
      <div class="amount">${fmt(net)}</div>
    </div>
  </div>

  ${p.note ? `<div style="font-size:12px;color:#64748B;margin-bottom:24px;">Note: ${p.note}</div>` : ""}

  <!-- Status stamp -->
  <div class="status-stamp">
    <div class="stamp">${statusText}</div>
  </div>

  <!-- Signature lines -->
  <div class="sig-row">
    <div class="sig-box">Employee Signature</div>
    <div class="sig-box">Authorized by</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>This payroll slip is an official document. Please keep it for your records.</div>
    <div style="font-weight:600;color:#475569;margin-top:4px;">S³ ERP &nbsp;·&nbsp; Generated ${today()}</div>
  </div>

</body>
</html>`;

  const win = window.open("", "_blank", "width=780,height=960");
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}
