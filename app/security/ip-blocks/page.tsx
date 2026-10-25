"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { security, IpBlock, BLOCK_DURATIONS } from "@/lib/api";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB");
}

/** "in 3 h", "in 12 min" — how long a temporary block has left. */
function remaining(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `in ${h} h` : `in ${Math.round(h / 24)} days`;
}

export default function IpBlocksPage() {
  const [rows, setRows] = useState<IpBlock[] | null>(null);
  const [yourIp, setYourIp] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  const [cidr, setCidr] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("1440");

  const load = useCallback(async () => {
    const [list, ov] = await Promise.all([security.ipBlocks(), security.overview()]);
    setRows(list);
    setYourIp(ov.yourIp);
  }, []);

  useEffect(() => {
    // Prefilled from the audit log's or a user's "Block" shortcut (?cidr=…&reason=…).
    const p = new URLSearchParams(window.location.search);
    if (p.get("cidr")) setCidr(p.get("cidr") || "");
    if (p.get("reason")) setReason(p.get("reason") || "");
    load().catch((e) => setErr(e.message));
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const target = cidr.trim();
    if (!target) return;
    const minutes = duration === "" ? null : Number(duration);
    const label = BLOCK_DURATIONS.find((d) => String(d.minutes ?? "") === duration)?.label ?? "";
    if (!confirm(`Block ${target} (${label.toLowerCase()})?\n\nEvery request from it will be refused, including sign-in.`))
      return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const row = await security.block(target, reason.trim(), minutes);
      setOk(`Blocked ${row.cidr}.`);
      setCidr("");
      setReason("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not block that address");
    } finally {
      setBusy(false);
    }
  }

  async function lift(b: IpBlock) {
    const verb = b.active ? "Lift the block on" : "Remove the expired entry for";
    if (!confirm(`${verb} ${b.cidr}?`)) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await security.unblock(b.id);
      setOk(b.active ? `${b.cidr} can connect again.` : `Removed ${b.cidr}.`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not lift the block");
    } finally {
      setBusy(false);
    }
  }

  const visible = rows?.filter((r) => showExpired || r.active) ?? null;
  const expiredCount = rows?.filter((r) => !r.active).length ?? 0;

  return (
    <Shell>
      <h1 className="page-h">Blocked IPs</h1>
      <p className="page-sub">
        Refuse every request from an address or range — before sign-in, before anything else. Blocks take effect within
        seconds. Addresses that fail sign-in too often are blocked automatically for a while and appear here as{" "}
        <b>Auto</b>.
      </p>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok-msg">{ok}</div>}

      <form className="panel" onSubmit={add}>
        <div className="panel__h">
          Block an address
          {yourIp && <small>your address: {yourIp}</small>}
        </div>
        <div className="sec-form">
          <div className="field">
            <label htmlFor="blk-cidr">IP address or CIDR range</label>
            <input id="blk-cidr" value={cidr} onChange={(e) => setCidr(e.target.value)}
              placeholder="203.0.113.7  or  203.0.113.0/24" required maxLength={64} spellCheck={false} />
          </div>
          <div className="field">
            <label htmlFor="blk-reason">Reason (recorded in the audit log)</label>
            <input id="blk-reason" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. credential stuffing against author accounts" maxLength={500} />
          </div>
          <div className="field">
            <label htmlFor="blk-dur">Duration</label>
            <select id="blk-dur" value={duration} onChange={(e) => setDuration(e.target.value)}>
              {BLOCK_DURATIONS.map((d) => (
                <option key={d.label} value={d.minutes ?? ""}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="field sec-form__go">
            <button className="btn" disabled={busy || !cidr.trim()}>{busy ? "Working…" : "Block"}</button>
          </div>
        </div>
        <p className="hint">
          Your own address, the site&apos;s internal/proxy network and ranges wider than /8 (IPv4) or /32 (IPv6) are
          refused, so a typo cannot lock out you or the public site.
        </p>
      </form>

      <div className="panel">
        <div className="panel__h">
          {showExpired ? "All blocks" : "Active blocks"}
          {expiredCount > 0 && (
            <label className="chk" style={{ fontWeight: 400, fontSize: ".8rem" }}>
              <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} />
              show {expiredCount} expired
            </label>
          )}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Address / range</th>
                <th>Reason</th>
                <th>Source</th>
                <th>Added</th>
                <th>Expires</th>
                <th style={{ textAlign: "right" }}>Refused requests</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible?.map((b) => (
                <tr key={b.id} style={b.active ? undefined : { opacity: 0.55 }}>
                  <td className="mono">{b.cidr}</td>
                  <td>{b.reason || <span className="muted">—</span>}</td>
                  <td>
                    <span className={`pill ${b.source === "AUTO" ? "AUTO" : ""}`}>{b.source === "AUTO" ? "Auto" : "Manual"}</span>
                  </td>
                  <td>
                    <div>{fmtDate(b.createdAt)}</div>
                    <div className="muted">{b.createdByEmail || (b.source === "AUTO" ? "brute-force detector" : "—")}</div>
                  </td>
                  <td>
                    {b.expiresAt ? (
                      <>
                        <div>{fmtDate(b.expiresAt)}</div>
                        <div className="muted">{b.active ? remaining(b.expiresAt) : "expired"}</div>
                      </>
                    ) : (
                      <b>Permanent</b>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div>{b.hitCount.toLocaleString()}</div>
                    {b.lastHitAt && <div className="muted">last {fmtDate(b.lastHitAt)}</div>}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <a className="btn btn--sm btn--ghost" href={`/security/audit?ip=${encodeURIComponent(b.cidr.split("/")[0])}`}>
                      Activity
                    </a>{" "}
                    <button type="button" className={`btn btn--sm ${b.active ? "btn--ok" : "btn--ghost"}`}
                      disabled={busy} onClick={() => lift(b)}>
                      {b.active ? "Unblock" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
              {visible && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">No {showExpired ? "" : "active "}blocks.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!rows && !err && <div className="muted">Loading…</div>}
      </div>
    </Shell>
  );
}
