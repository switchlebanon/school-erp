import { useState } from "react";
import { C } from "../theme";
import { Badge, Card, SectionTitle, priorityColor } from "../components/Shared";
import { announcements as initialAnnouncements } from "../data/mockData";

export default function Announcements() {
  const [items, setItems] = useState(initialAnnouncements);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Academic");

  const add = () => {
    if (!title.trim()) return;
    setItems([{ id: Date.now(), title, date: "Today", type, priority: "medium" }, ...items]);
    setTitle("");
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px", color: C.text }}>Notices & Announcements</h2>
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>New Announcement</SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title…"
            style={{ flex: 1, minWidth: 180, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
          <select value={type} onChange={e => setType(e.target.value)}
            style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}>
            {["Academic", "Event", "Admin"].map(o => <option key={o}>{o}</option>)}
          </select>
          <button onClick={add} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Publish
          </button>
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(a => (
          <Card key={a.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: C.accentL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {a.type === "Academic" ? "📚" : a.type === "Event" ? "🗓" : "📋"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{a.title}</div>
              <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>Posted {a.date}</div>
            </div>
            <Badge label={a.type} color={C.accent} bg={C.accentL} />
            <Badge {...priorityColor(a.priority)} label={a.priority} />
          </Card>
        ))}
      </div>
    </div>
  );
}
