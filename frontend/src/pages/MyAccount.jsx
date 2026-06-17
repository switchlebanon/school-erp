import { useState } from "react";
import { C } from "../theme";
import { Card, SectionTitle } from "../components/Shared";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6,
};

const roleBadge = (role) => {
  const colors = {
    ADMIN:   { color: C.purple, bg: C.purpleL },
    TEACHER: { color: C.green,  bg: C.greenL },
    PARENT:  { color: C.accent, bg: C.accentL },
    STUDENT: { color: C.amber,  bg: C.amberL },
  };
  return colors[role] || { color: C.slate, bg: C.slateL };
};

export default function MyAccount({ onNav }) {
  const { user, refreshUser } = useAuth();

  // Profile fields
  const [name, setName]   = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg]       = useState("");
  const [profileErr, setProfileErr]       = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg]       = useState("");
  const [pwErr, setPwErr]       = useState("");

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileErr(""); setProfileMsg("");
    if (!name.trim()) { setProfileErr("Name cannot be empty."); return; }

    setProfileSaving(true);
    try {
      await api.put("/auth/me", { name: name.trim(), phone: phone.trim() || null });
      setProfileMsg("✓ Profile updated");
      if (refreshUser) refreshUser();
    } catch (err) {
      setProfileErr(err.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwErr(""); setPwMsg("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwErr("All password fields are required."); return;
    }
    if (newPassword.length < 6) {
      setPwErr("New password must be at least 6 characters."); return;
    }
    if (newPassword !== confirmPassword) {
      setPwErr("New password and confirmation don't match."); return;
    }

    setPwSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setPwMsg("✓ Password changed successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setPwErr(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const badge = roleBadge(user?.role);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>My Account</h2>
        <p style={{ color: C.textMid, fontSize: 13, margin: "2px 0 0" }}>Manage your profile and security settings</p>
      </div>

      {/* Profile card */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: C.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontWeight: 700, fontSize: 22, flexShrink: 0,
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: C.slate, marginBottom: 4 }}>{user?.email}</div>
            <span style={{
              background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700,
              padding: "2px 9px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em",
            }}>{user?.role}</span>
          </div>
        </div>

        <SectionTitle>Profile Information</SectionTitle>
        <form onSubmit={handleProfileSave}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Email</label>
            <input value={user?.email || ""} disabled style={{ ...inputStyle, background: C.slateL, color: C.slate }} />
            <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>Email cannot be changed.</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Phone (optional)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+961 ..." style={inputStyle} />
          </div>

          {profileErr && (
            <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
              {profileErr}
            </div>
          )}
          {profileMsg && (
            <div style={{ background: C.greenL, color: C.green, fontSize: 12, fontWeight: 600, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
              {profileMsg}
            </div>
          )}

          <button type="submit" disabled={profileSaving} style={{
            background: C.accent, color: C.white, border: "none", borderRadius: 8,
            padding: "9px 20px", fontWeight: 600, fontSize: 13,
            cursor: profileSaving ? "default" : "pointer", opacity: profileSaving ? 0.7 : 1,
          }}>
            {profileSaving ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </Card>

      {/* Password card */}
      <Card>
        <SectionTitle>Change Password</SectionTitle>
        <form onSubmit={handlePasswordChange}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ fontSize: 11, color: C.slate, marginBottom: 14 }}>
            Password must be at least 6 characters.
          </div>

          {pwErr && (
            <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
              {pwErr}
            </div>
          )}
          {pwMsg && (
            <div style={{ background: C.greenL, color: C.green, fontSize: 12, fontWeight: 600, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
              {pwMsg}
            </div>
          )}

          <button type="submit" disabled={pwSaving} style={{
            background: C.green, color: C.white, border: "none", borderRadius: 8,
            padding: "9px 20px", fontWeight: 600, fontSize: 13,
            cursor: pwSaving ? "default" : "pointer", opacity: pwSaving ? 0.7 : 1,
          }}>
            {pwSaving ? "Updating…" : "Change Password"}
          </button>
        </form>
      </Card>

      {/* Admin: Manage Users */}
      {user?.role === "ADMIN" && (
        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>User Accounts</div>
            <div style={{ fontSize: 12, color: C.slate }}>Create and manage logins for teachers, parents, and staff.</div>
          </div>
          <button onClick={() => onNav?.("users")} style={{
            background: C.accent, color: C.white, border: "none", borderRadius: 8,
            padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            Manage Users →
          </button>
        </Card>
      )}
    </div>
  );
}
