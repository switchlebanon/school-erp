import { C } from "../theme";

export const Badge = ({ label, color, bg }) => (
  <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
    {label}
  </span>
);

export const feeColor    = (s) => s === "Paid"   ? { color: C.green, bg: C.greenL } : s === "Pending" ? { color: C.amber, bg: C.amberL } : { color: C.red, bg: C.redL };
export const statusColor = (s) => s === "Active" ? { color: C.green, bg: C.greenL } : { color: C.slate, bg: C.slateL };
export const priorityColor = (p) => p === "high" ? { color: C.red, bg: C.redL } : p === "medium" ? { color: C.amber, bg: C.amberL } : { color: C.slate, bg: C.slateL };

export const Card = ({ children, style = {} }) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, ...style }}>
    {children}
  </div>
);

export const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
    {children}
  </div>
);
