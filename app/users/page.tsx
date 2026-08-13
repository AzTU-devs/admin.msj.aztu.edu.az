"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { users, AdminUser, ROLE_OPTIONS } from "@/lib/api";

export default function UsersPage() {
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => { users.list().then(setRows).catch((e) => setErr(e.message)); }, []);

  async function toggle(u: AdminUser, role: string) {
    const next = u.roles.includes(role) ? u.roles.filter((r) => r !== role) : [...u.roles, role];
    if (next.length === 0) { setErr("A user must keep at least one role."); return; }
    setSavingId(u.id); setErr("");
    try {
      const updated = await users.setRoles(u.id, next);
      setRows((rs) => rs?.map((r) => (r.id === u.id ? updated : r)) ?? null);
    } catch (e) { setErr(e instanceof Error ? e.message : "Update failed"); }
    finally { setSavingId(null); }
  }

  return (
    <Shell>
      <h1 className="page-h">Users &amp; Roles</h1>
      <p className="page-sub">Grant or revoke roles. Editors can open issues and manage content; reviewers get the review console; authors can submit.</p>
      {err && <div className="err">{err}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>User</th><th>Email</th><th>Status</th>
              {ROLE_OPTIONS.map((r) => <th key={r} style={{ textAlign: "center" }}>{r.replaceAll("_", " ")}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows?.map((u) => (
              <tr key={u.id}>
                <td className="t-title">{u.firstName} {u.lastName}</td>
                <td className="muted">{u.email}</td>
                <td className="muted">{u.status}</td>
                {ROLE_OPTIONS.map((role) => (
                  <td key={role} style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={u.roles.includes(role)} disabled={savingId === u.id}
                      onChange={() => toggle(u, role)} style={{ width: "auto", cursor: "pointer" }} />
                  </td>
                ))}
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={3 + ROLE_OPTIONS.length} className="muted">No users yet.</td></tr>}
          </tbody>
        </table>
        {!rows && !err && <div className="muted">Loading…</div>}
      </div>
    </Shell>
  );
}
