"use client";
import { Fragment, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { users, security, AdminUser, AdminUserDetail, ROLE_OPTIONS } from "@/lib/api";

/** Status colours: blocked has to read as blocked at a glance, not as a word. */
const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "#15803d", label: "Active" },
  BLOCKED: { color: "#b91c1c", label: "Blocked" },
  PENDING: { color: "#b45309", label: "Pending" },
  DELETED: { color: "#78859b", label: "Erased" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { color: "inherit", label: status };
  return <b style={{ color: s.color }}>{s.label}</b>;
}

function fmt(value: string | number | boolean | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB");
}

/** A short, readable browser name from a user-agent string. */
function browser(ua: string | null): string {
  if (!ua) return "—";
  const name = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : ua.split(" ")[0];
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android"
    : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${name} · ${os}` : name;
}

type SecurityActions = {
  busy: boolean;
  onRevoke: () => void;
  onUnlock: () => void;
  onBlockIp: (ip: string) => void;
};

/** Sign-in state and recent sessions: where the account has been used from. */
function SecurityPanel({ d, a }: { d: AdminUserDetail; a: SecurityActions }) {
  const erased = d.status === "DELETED";
  const lockedMin = Math.ceil(d.signInLockedForSeconds / 60);
  return (
    <div style={{ borderTop: "1px solid var(--rule)", marginTop: ".6rem", paddingTop: ".6rem" }}>
      <div className="panel__h" style={{ marginBottom: ".2rem" }}>
        Security <small>recent sign-ins</small>
      </div>
      {!erased && (
        <div className="user-sec">
          <button type="button" className="btn btn--sm btn--warn" disabled={a.busy} onClick={a.onRevoke}
            title="Revoke every session; the account stays active and can sign in again">
            Sign out everywhere
          </button>
          {d.signInLockedForSeconds > 0 && (
            <button type="button" className="btn btn--sm btn--ghost" disabled={a.busy} onClick={a.onUnlock}>
              Clear sign-in lockout ({lockedMin} min left)
            </button>
          )}
          <a className="btn btn--sm btn--ghost" href={`/security/audit?entity=user&entityId=${d.id}`}>
            Audit history
          </a>
        </div>
      )}
      {d.sessions.length === 0 ? (
        <div className="muted">No sign-ins recorded.</div>
      ) : (
        <table className="sessions">
          <thead>
            <tr><th>Signed in</th><th>IP address</th><th>Browser</th><th>State</th><th /></tr>
          </thead>
          <tbody>
            {d.sessions.map((s) => (
              <tr key={s.id}>
                <td>{fmtDate(s.createdAt)}</td>
                <td className="mono">{s.ipAddress || "—"}</td>
                <td title={s.userAgent || ""}>{browser(s.userAgent)}</td>
                <td>{s.active ? <b style={{ color: "#15803d" }}>Active</b> : <span className="muted">Ended</span>}</td>
                <td style={{ textAlign: "right" }}>
                  {s.ipAddress && (
                    <button type="button" className="btn btn--sm btn--danger" disabled={a.busy}
                      onClick={() => a.onBlockIp(s.ipAddress!)}>
                      Block IP
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Every stored field, in the order an admin reads them. */
function DetailPanel({ d, a }: { d: AdminUserDetail; a: SecurityActions }) {
  const rows: [string, string][] = [
    ["User ID", fmt(d.id)],
    ["E-mail", fmt(d.email)],
    ["E-mail verified", d.emailVerified ? `Yes — ${fmtDate(d.emailVerifiedAt)}` : "No"],
    ["First name", fmt(d.firstName)],
    ["Middle name", fmt(d.middleName)],
    ["Last name", fmt(d.lastName)],
    ["Academic title", fmt(d.title)],
    ["Degree", fmt(d.degree)],
    ["Position", fmt(d.position)],
    ["Affiliation", fmt(d.affiliation)],
    ["Country", fmt(d.country)],
    ["City", fmt(d.city)],
    ["Postal code", fmt(d.postalCode)],
    ["Phone", fmt(d.phone)],
    ["ORCID", fmt(d.orcid)],
    ["Scopus ID", fmt(d.scopusId)],
    ["Website", fmt(d.websiteUrl)],
    ["Avatar URL", fmt(d.avatarUrl)],
    ["Biography", fmt(d.bio)],
    ["Status", fmt(d.status)],
    ["Available as reviewer", fmt(d.availableReviewer)],
    ["Preferred locale", fmt(d.preferredLocale)],
    ["Roles", d.roles.length ? d.roles.join(", ") : "—"],
    ["Submissions", fmt(d.submissionCount)],
    ["Reviews written", fmt(d.reviewCount)],
    ["Review assignments", fmt(d.reviewAssignmentCount)],
    ["Last sign-in", fmtDate(d.lastLoginAt)],
    ["Registered", fmtDate(d.createdAt)],
    ["Last updated", fmtDate(d.updatedAt)],
  ];

  return (
    <div style={{ padding: "0.6rem 0" }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: "1rem", padding: "0.25rem 0" }}>
          <span className="muted" style={{ minWidth: "11rem", flexShrink: 0 }}>
            {k}
          </span>
          <span style={{ wordBreak: "break-word" }}>{v}</span>
        </div>
      ))}
      <SecurityPanel d={d} a={a} />
    </div>
  );
}

export default function UsersPage() {
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [ok, setOk] = useState("");

  useEffect(() => {
    users.list().then(setRows).catch((e) => setErr(e.message));
  }, []);

  function replaceRow(updated: AdminUser) {
    setRows((rs) => rs?.map((r) => (r.id === updated.id ? updated : r)) ?? null);
  }

  async function toggle(u: AdminUser, role: string) {
    const next = u.roles.includes(role) ? u.roles.filter((r) => r !== role) : [...u.roles, role];
    if (next.length === 0) {
      setErr("A user must keep at least one role.");
      return;
    }
    setSavingId(u.id);
    setErr("");
    try {
      replaceRow(await users.setRoles(u.id, next));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function openDetail(u: AdminUser) {
    if (openId === u.id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(u.id);
    setDetail(null);
    setLoadingDetail(true);
    setErr("");
    try {
      setDetail(await users.detail(u.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load the profile");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function setStatus(u: AdminUser, status: string) {
    const verb = status === "ACTIVE" ? "Re-activate" : "Block";
    if (!confirm(`${verb} ${u.firstName} ${u.lastName} (${u.email})?`)) return;
    setSavingId(u.id);
    setErr("");
    try {
      const updated = await users.setStatus(u.id, status);
      replaceRow(updated);
      if (openId === u.id) setDetail(await users.detail(u.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  /**
   * Delete, the safe way. An account with no editorial history is removed
   * outright. One with submissions or reviews cannot be — the manuscripts and
   * reviews would lose their author — so the admin is offered erasure instead:
   * every personal field cleared, sign-in disabled, the record kept intact.
   */
  async function remove(u: AdminUser) {
    setSavingId(u.id);
    setErr("");
    setOk("");
    try {
      const d = await users.detail(u.id);
      const who = `${u.firstName} ${u.lastName} (${u.email})`;
      if (d.deletable) {
        if (!confirm(`Permanently delete ${who}?\n\nThe account and its sessions are removed. This cannot be undone.`)) return;
        await users.remove(u.id);
        setRows((rs) => rs?.filter((r) => r.id !== u.id) ?? null);
        if (openId === u.id) {
          setOpenId(null);
          setDetail(null);
        }
        setOk(`Deleted ${u.email}.`);
      } else {
        const history = [
          d.submissionCount && `${d.submissionCount} submission(s)`,
          d.reviewCount && `${d.reviewCount} review(s)`,
          d.reviewAssignmentCount && `${d.reviewAssignmentCount} review assignment(s)`,
        ].filter(Boolean).join(", ");
        if (
          !confirm(
            `${who} has ${history}, so the account cannot be deleted without breaking the editorial record.\n\n` +
              `Erase their personal data instead? Name, e-mail, phone, ORCID, affiliation and every other profile ` +
              `field are cleared, all sessions end and the account can never sign in again. ` +
              `Their manuscripts and reviews stay in place. This cannot be undone.`
          )
        )
          return;
        replaceRow(await users.anonymize(u.id));
        if (openId === u.id) setDetail(await users.detail(u.id));
        setOk(`Erased the personal data of ${u.email}.`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSavingId(null);
    }
  }

  async function revokeSessions(u: AdminUser) {
    if (!confirm(`Sign ${u.email} out of every device now?\n\nThe account stays active and can sign in again.`)) return;
    await run(u, async () => {
      await users.revokeSessions(u.id);
      setOk(`${u.email} has been signed out everywhere.`);
    });
  }

  async function unlock(u: AdminUser) {
    await run(u, async () => {
      await users.unlock(u.id);
      setOk(`Cleared the sign-in lockout for ${u.email}.`);
    });
  }

  async function blockIp(u: AdminUser, ip: string) {
    if (!confirm(`Block ${ip} for 24 hours?\n\nEvery request from that address is refused — for all accounts, ` +
      `not just ${u.email}. Shared networks (a university, a café) would be cut off too.`)) return;
    await run(u, async () => {
      await security.block(ip, `Blocked from the session list of ${u.email}`, 1440);
      setOk(`Blocked ${ip} for 24 hours. Manage it under Blocked IPs.`);
    });
  }

  /** Runs an action against one user's row and reloads the open profile afterwards. */
  async function run(u: AdminUser, fn: () => Promise<void>) {
    setSavingId(u.id);
    setErr("");
    setOk("");
    try {
      await fn();
      if (openId === u.id) setDetail(await users.detail(u.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSavingId(null);
    }
  }

  const columns = 5 + ROLE_OPTIONS.length;

  return (
    <Shell>
      <h1 className="page-h">Users &amp; Roles</h1>
      <p className="page-sub">
        Grant or revoke roles, open a full profile, block an account, or delete one. Editors can open issues and
        manage content; reviewers get the review console; authors can submit. Blocking and signing out take effect
        on the account&apos;s very next request. Accounts with submissions or reviews are erased (personal data
        cleared) rather than deleted, so the editorial record stays intact.
      </p>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok-msg">{ok}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Status</th>
              {ROLE_OPTIONS.map((r) => (
                <th key={r} style={{ textAlign: "center" }}>
                  {r.replaceAll("_", " ")}
                </th>
              ))}
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td className="t-title">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  {ROLE_OPTIONS.map((role) => (
                    <td key={role} style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={u.roles.includes(role)}
                        disabled={savingId === u.id || u.status === "DELETED"}
                        onChange={() => toggle(u, role)}
                        style={{ width: "auto", cursor: "pointer" }}
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => openDetail(u)}
                      aria-expanded={openId === u.id}
                    >
                      {openId === u.id ? "Hide" : "Details"}
                    </button>{" "}
                    {u.status === "DELETED" ? null : u.status === "BLOCKED" ? (
                      <button
                        type="button"
                        className="btn btn--sm btn--ok"
                        disabled={savingId === u.id}
                        onClick={() => setStatus(u, "ACTIVE")}
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--sm btn--warn"
                        disabled={savingId === u.id}
                        onClick={() => setStatus(u, "BLOCKED")}
                      >
                        Block
                      </button>
                    )}{" "}
                    {u.status !== "DELETED" && (
                      <button
                        type="button"
                        className="btn btn--sm btn--danger"
                        disabled={savingId === u.id}
                        onClick={() => remove(u)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>

                {openId === u.id && (
                  <tr>
                    <td colSpan={columns}>
                      {loadingDetail && <div className="muted">Loading profile…</div>}
                      {detail && detail.id === u.id && (
                        <DetailPanel
                          d={detail}
                          a={{
                            busy: savingId === u.id,
                            onRevoke: () => revokeSessions(u),
                            onUnlock: () => unlock(u),
                            onBlockIp: (ip) => blockIp(u, ip),
                          }}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {rows && rows.length === 0 && (
              <tr>
                <td colSpan={columns} className="muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!rows && !err && <div className="muted">Loading…</div>}
      </div>
    </Shell>
  );
}
