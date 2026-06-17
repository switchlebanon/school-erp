import { useState } from "react";
import { C } from "../theme";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@scube.test");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.slateL, fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        width: 380, background: C.white, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: 32, boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: C.accent,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>🏫</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: C.text, lineHeight: 1.2 }}>S³</div>
            <div style={{ color: C.slate, fontSize: 12 }}>ERP System</div>
          </div>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Welcome back</h1>
        <p style={{ fontSize: 13, color: C.textMid, margin: "0 0 20px" }}>Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px",
              fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14,
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, display: "block", marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px",
              fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14,
            }}
          />

          {error && (
            <div style={{
              background: C.redL, color: C.red, fontSize: 12, fontWeight: 500,
              padding: "8px 12px", borderRadius: 8, marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", background: C.accent, color: C.white, border: "none",
              borderRadius: 8, padding: "10px 0", fontWeight: 600, fontSize: 14,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 12, color: C.slate, textAlign: "center" }}>
          Demo admin: <b>admin@scube.test</b> / <b>admin123</b>
        </div>
      </div>
    </div>
  );
}
