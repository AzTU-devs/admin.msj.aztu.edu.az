"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, auth } from "@/lib/api";

const TITLES = ["Dr", "Prof", "Mr", "Ms"];
const DEGREES = ["Ph.D", "MD", "Ph.D Candidate", "MsC", "MsC Student", "BsC", "Other"];
const POSITIONS = ["Professor", "Associate Professor", "Assistant Professor", "Instructor", "Other"];

const EMPTY = {
  title: "", firstName: "", lastName: "", email: "", password: "", phone: "",
  degree: "", position: "", affiliation: "", country: "", city: "", postalCode: "", orcid: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ ...EMPTY });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setBusy(true);
    try {
      const res = await api.register(f);
      auth.set(res.accessToken, res.refreshToken);
      router.replace("/submissions");
    } catch (err) { setError(err instanceof Error ? err.message : "Registration failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="login">
      <form className="login__box" onSubmit={submit} style={{ width: 600, maxWidth: "94vw" }}>
        <h1>Create an author account</h1>
        <p>Submit and track manuscripts for Machine Science.</p>
        {error && <div className="err">{error}</div>}

        <div className="grid2">
          <div className="field"><label>Title *</label>
            <select value={f.title} onChange={(e) => set("title", e.target.value)} required>
              <option value="">Select…</option>
              {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div className="field"><label>Phone *</label>
            <input value={f.phone} onChange={(e) => set("phone", e.target.value)} required /></div>
        </div>

        <div className="grid2">
          <div className="field"><label>First name *</label>
            <input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} required /></div>
          <div className="field"><label>Last name *</label>
            <input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} required /></div>
        </div>

        <div className="field"><label>Email *</label>
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} required /></div>

        <div className="field"><label>Password *</label>
          <input type="password" value={f.password} onChange={(e) => set("password", e.target.value)} required />
          <div className="hint">At least 8 characters.</div></div>

        <div className="grid2">
          <div className="field"><label>Degree *</label>
            <select value={f.degree} onChange={(e) => set("degree", e.target.value)} required>
              <option value="">Select…</option>
              {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select></div>
          <div className="field"><label>Position *</label>
            <select value={f.position} onChange={(e) => set("position", e.target.value)} required>
              <option value="">Select…</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select></div>
        </div>

        <div className="field"><label>Affiliation *</label>
          <input value={f.affiliation} onChange={(e) => set("affiliation", e.target.value)} required /></div>

        <div className="field"><label>Country *</label>
          <input value={f.country} onChange={(e) => set("country", e.target.value)} required /></div>

        <div className="grid2">
          <div className="field"><label>City</label>
            <input value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
          <div className="field"><label>Postal code</label>
            <input value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} /></div>
        </div>

        <div className="field"><label>ORCID *</label>
          <input value={f.orcid} onChange={(e) => set("orcid", e.target.value)} placeholder="0000-0000-0000-0000" required /></div>

        <button className="btn" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Creating…" : "Create account"}</button>
        <p className="muted" style={{ marginTop: "1.2rem" }}>
          Already have an account? <Link className="linkish" href="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
