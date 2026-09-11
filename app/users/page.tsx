"use client";
import { Fragment, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { users, AdminUser, AdminUserDetail, ROLE_OPTIONS } from "@/lib/api";

/** Status colours: blocked has to read as blocked at a glance, not as a word. */
const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "#15803d", label: "Active" },
  BLOCKED: { color: "#b91c1c", label: "Blocked" },
  PENDING: { color: "#b45309", label: "Pending" },
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

/** Every stored field, in the order an admin reads them. */
function DetailPanel({ d }: { d: AdminUserDetail }) {
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
    ["Last sign-in", fmtDate(d.lastLoginAt)],
    ["Registered", fmtDate(d.createdAt)],
    ["Last updated", fmtDate(d.updatedAt)],
  ];

  return (
    <div className="kv" style={{ padding: "0.6rem 0" }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: "1rem", padding: "0.25rem 0" }}>
          <span className="muted" style={{ minWidth: "11rem", flexShrink: 0 }}>
            {k}
          </span>
          <span style={{ wordBreak: "break-word" }}>{v}</span>
        </div>
      ))}
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

  async function remove(u: AdminUser) {
    if (
      !confirm(
        `Permanently delete ${u.firstName} ${u.lastName} (${u.email})?\n\n` +
          `This cannot be undone. If the account has submissions, block it instead.`
      )
    )
      return;
    setSavingId(u.id);
    setErr("");
    try {
      await users.remove(u.id);
      setRows((rs) => rs?.filter((r) => r.id !== u.id) ?? null);
      if (openId === u.id) {
        setOpenId(null);
        setDetail(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
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
        manage content; reviewers get the review console; authors can submit. Blocking takes effect immediately —
        the account&apos;s sessions are revoked on the spot.
      </p>
      {err && <div className="err">{err}</div>}

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
                        disabled={savingId === u.id}
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
                    {u.status === "BLOCKED" ? (
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
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      disabled={savingId === u.id}
                      onClick={() => remove(u)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>

                {openId === u.id && (
                  <tr>
                    <td colSpan={columns}>
                      {loadingDetail && <div className="muted">Loading profile…</div>}
                      {detail && detail.id === u.id && <DetailPanel d={detail} />}
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
