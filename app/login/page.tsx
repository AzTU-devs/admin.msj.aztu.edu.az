"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, auth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.login(email, password);
      auth.set(res.accessToken, res.refreshToken);
      const roles = res.user.roles || [];
      if (roles.some((r) => ["ADMIN", "EDITOR_IN_CHIEF", "EDITOR"].includes(r))) router.replace("/");
      else if (roles.includes("REVIEWER")) router.replace("/reviews");
      else router.replace("/submissions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login__box" onSubmit={submit}>
        <h1>Machine Science</h1>
        <p>Sign in to the journal portal</p>
        {error && <div className="err">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted" style={{ marginTop: "1.2rem" }}>
          New author? <Link className="linkish" href="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
