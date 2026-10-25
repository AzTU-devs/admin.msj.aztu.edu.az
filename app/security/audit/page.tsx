"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import {
  security, AuditFilter, AuditRow, PageResp, SecurityOverview, AUDIT_ACTION_LABELS,
} from "@/lib/api";

const PAGE_SIZE = 50;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB");
}

function label(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}

export default function AuditPage() {
  const [ov, setOv] = useState<SecurityOverview | null>(null);
  const [data, setData] = useState<PageResp<AuditRow> | null>(null);
  const [draft, setDraft] = useState<AuditFilter>({});
  const [filter, setFilter] = useState<AuditFilter>({});
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (f: AuditFilter, p: number) => {
    setLoading(true);
    setErr("");
    try {
      setData(await security.auditLogs(f, p, PAGE_SIZE));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load the audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deep links from other screens: ?ip=…, ?action=…, ?entity=user&entityId=…
    const p = new URLSearchParams(window.location.search);
    const initial: AuditFilter = {};
    for (const k of ["action", "outcome", "q", "ip", "entity", "entityId", "from", "to"] as const) {
      const v = p.get(k);
      if (v) initial[k] = v;
    }
    setDraft(initial);
    setFilter(initial);
    security.overview().then(setOv).catch((e) => setErr(e.message));
    load(initial, 0);
  }, [load]);

  function apply(e?: React.FormEvent) {
    e?.preventDefault();
    setFilter(draft);
    setPage(0);
    setOpenId(null);
    load(draft, 0);
  }

  function reset() {
    setDraft({});
    setFilter({});
    setPage(0);
    load({}, 0);
  }

  function quick(f: AuditFilter) {
    setDraft(f);
    setFilter(f);
    setPage(0);
    load(f, 0);
  }

  function go(p: number) {
    setPage(p);
    setOpenId(null);
    load(filter, p);
  }

  async function exportCsv() {
    setExporting(true);
    setErr("");
    try {
      await security.exportAuditCsv(filter);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const set = (k: keyof AuditFilter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value || undefined }));

  return (
    <Shell>
      <div className="cms-head">
        <div>
          <h1 className="page-h">Audit Log</h1>
          <p className="page-sub">
            Every sign-in, permission change, block and editorial action, with who did it and from where. Entries are
            append-only and kept for the configured retention period.
          </p>
        </div>
        <button className="btn btn--ghost" onClick={exportCsv} disabled={exporting}
          title="Download the entries matching the current filters (up to 10,000)">
          {exporting ? "Exporting…" : "⤓ Export CSV"}
        </button>
      </div>
      {err && <div className="err">{err}</div>}

      {ov && (
        <div className="cards">
          <Tile k="Sign-ins · 24 h" v={ov.signInsOk24h} onClick={() => quick({ action: "LOGIN_SUCCESS" })} />
          <Tile k="Failed sign-ins · 24 h" v={ov.signInsFailed24h} warn={ov.signInsFailed24h > 20}
            onClick={() => quick({ action: "LOGIN_FAILURE" })} />
          <Tile k="Accounts locked · 24 h" v={ov.lockouts24h} warn={ov.lockouts24h > 0}
            onClick={() => quick({ action: "ACCOUNT_LOCKED" })} />
          <Tile k="Access denied · 24 h" v={ov.accessDenied24h} warn={ov.accessDenied24h > 0}
            onClick={() => quick({ action: "ACCESS_DENIED" })} />
          <Tile k="Rate limited · 24 h" v={ov.rateLimited24h} onClick={() => quick({ action: "RATE_LIMITED" })} />
          <Tile k="Auto-blocks · 24 h" v={ov.autoBlocks24h} warn={ov.autoBlocks24h > 0}
            onClick={() => quick({ action: "IP_AUTO_BLOCKED" })} />
          <Tile k="Token replays · 24 h" v={ov.tokenReuse24h} danger={ov.tokenReuse24h > 0}
            onClick={() => quick({ action: "REFRESH_TOKEN_REUSE" })} />
          <Tile k="Active IP blocks" v={ov.activeIpBlocks} href="/security/ip-blocks" />
        </div>
      )}

      <form className="panel" onSubmit={apply}>
        <div className="audit-filters">
          <div className="field">
            <label htmlFor="f-action">Action</label>
            <select id="f-action" value={draft.action ?? ""} onChange={set("action")}>
              <option value="">Any</option>
              {(ov?.actions ?? []).map((a) => <option key={a} value={a}>{label(a)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-outcome">Outcome</label>
            <select id="f-outcome" value={draft.outcome ?? ""} onChange={set("outcome")}>
              <option value="">Any</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
              <option value="DENIED">Denied</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-q">Actor e-mail or text</label>
            <input id="f-q" value={draft.q ?? ""} onChange={set("q")} placeholder="name@aztu.edu.az" />
          </div>
          <div className="field">
            <label htmlFor="f-ip">IP address (prefix)</label>
            <input id="f-ip" value={draft.ip ?? ""} onChange={set("ip")} placeholder="203.0.113." spellCheck={false} />
          </div>
          <div className="field">
            <label htmlFor="f-from">From</label>
            <input id="f-from" type="date" value={draft.from ?? ""} onChange={set("from")} />
          </div>
          <div className="field">
            <label htmlFor="f-to">To</label>
            <input id="f-to" type="date" value={draft.to ?? ""} onChange={set("to")} />
          </div>
        </div>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <button className="btn" disabled={loading}>Apply filters</button>
          <button type="button" className="btn btn--ghost" onClick={reset} disabled={loading}>Reset</button>
          {(filter.entity || filter.entityId) && (
            <span className="muted">
              target: {filter.entity}{filter.entityId ? ` #${filter.entityId}` : ""}
            </span>
          )}
          {data && <span className="muted" style={{ marginLeft: "auto" }}>{data.totalElements.toLocaleString()} entries</span>}
        </div>
      </form>

      <div className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((r) => (
                <Fragment key={r.id}>
                  <tr className="audit-row" onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    aria-expanded={openId === r.id}>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.createdAt)}</td>
                    <td>
                      <span className={`pill outcome-${r.outcome}`}>{label(r.action)}</span>
                    </td>
                    <td>{r.actorEmail || <span className="muted">{r.actorId ? `#${r.actorId}` : "anonymous"}</span>}</td>
                    <td className="muted">{r.entity ? `${r.entity}${r.entityId ? ` #${r.entityId}` : ""}` : "—"}</td>
                    <td className="t-title">{r.summary}</td>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>{r.ipAddress || "—"}</td>
                  </tr>
                  {openId === r.id && (
                    <tr>
                      <td colSpan={6} className="audit-detail">
                        <dl className="kv">
                          <dt>Entry</dt><dd>#{r.id} · {r.outcome}</dd>
                          <dt>Action code</dt><dd className="mono">{r.action}</dd>
                          <dt>Browser</dt><dd className="mono" style={{ wordBreak: "break-all" }}>{r.userAgent || "—"}</dd>
                          {r.metadata && (
                            <>
                              <dt>Data</dt>
                              <dd><pre className="audit-meta">{JSON.stringify(r.metadata, null, 2)}</pre></dd>
                            </>
                          )}
                        </dl>
                        <div style={{ display: "flex", gap: ".5rem", marginTop: ".8rem", flexWrap: "wrap" }}>
                          {r.ipAddress && (
                            <>
                              <button type="button" className="btn btn--sm btn--ghost"
                                onClick={(e) => { e.stopPropagation(); quick({ ip: r.ipAddress! }); }}>
                                All activity from {r.ipAddress}
                              </button>
                              <a className="btn btn--sm btn--danger"
                                href={`/security/ip-blocks?cidr=${encodeURIComponent(r.ipAddress)}&reason=${encodeURIComponent(
                                  `From audit entry #${r.id}: ${label(r.action)}`)}`}>
                                Block this IP…
                              </a>
                            </>
                          )}
                          {r.entity === "user" && r.entityId && (
                            <button type="button" className="btn btn--sm btn--ghost"
                              onClick={(e) => { e.stopPropagation(); quick({ entity: "user", entityId: r.entityId! }); }}>
                              History of user #{r.entityId}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {data && data.content.length === 0 && (
                <tr><td colSpan={6} className="muted">No entries match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {!data && loading && <div className="muted">Loading…</div>}
        {data && data.totalPages > 1 && (
          <div className="pager">
            <button className="btn btn--sm btn--ghost" disabled={page === 0 || loading} onClick={() => go(page - 1)}>
              ← Newer
            </button>
            <span className="muted">page {page + 1} of {data.totalPages}</span>
            <button className="btn btn--sm btn--ghost" disabled={data.last || loading} onClick={() => go(page + 1)}>
              Older →
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Tile({ k, v, warn, danger, onClick, href }: {
  k: string; v: number; warn?: boolean; danger?: boolean; onClick?: () => void; href?: string;
}) {
  const cls = `card card--action${danger ? " card--danger" : warn ? " card--warn" : ""}`;
  const body = (
    <>
      <div className="card__k">{k}</div>
      <div className="card__v">{v.toLocaleString()}</div>
    </>
  );
  return href ? (
    <a className={cls} href={href}>{body}</a>
  ) : (
    <button type="button" className={cls} onClick={onClick}>{body}</button>
  );
}
