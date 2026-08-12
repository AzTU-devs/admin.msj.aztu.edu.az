"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, auth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@msj.aztu.edu.az");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.login(email, password);
      const roles = res.user.roles || [];
      const isEditorial = roles.some((r) => ["ADMIN", "EDITOR_IN_CHIEF", "EDITOR"].includes(r));
      const isReviewer = roles.includes("REVIEWER");
      if (!isEditorial && !isReviewer) {
        throw new Error("This account has no staff access. Authors sign in on the journal site.");
      }
      auth.set(res.accessToken, res.refreshToken);
      router.replace(isEditorial ? "/" : "/reviews");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login__box" onSubmit={submit}>
        <h1>Editorial Admin</h1>
        <p>Machine Science · Azerbaijan Technical University</p>
        {error && <div className="err">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </div>
        <button className="btn" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted" style={{ marginTop: "1.2rem" }}>Demo: admin@msj.aztu.edu.az · Demo12345!</p>
      </form>
    </div>
  );
}
