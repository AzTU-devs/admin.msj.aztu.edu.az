"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import {
  COUNTRY_NAMES,
  MetricsExport,
  countryFlag,
  reports,
} from "@/lib/api";

const JOURNAL = "Machine Science";
const PUBLISHER = "Azerbaijan Technical University";
const ISSN = "2227-6912";
const E_ISSN = "2790-0479";

function n(v: number) {
  return v.toLocaleString();
}

function pages(a: { pageStart: number | null; pageEnd: number | null }) {
  if (a.pageStart == null) return "—";
  return a.pageEnd != null && a.pageEnd !== a.pageStart ? `${a.pageStart}–${a.pageEnd}` : `${a.pageStart}`;
}

const ROMAN: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };
function issueLabel(year: number | null, number: number | null) {
  if (year == null) return "—";
  return number == null ? `${year}` : `${year} · ${ROMAN[number] ?? number}`;
}

/**
 * Printable metrics report.
 *
 * Rendered as a normal page and printed with the browser rather than generated
 * with a PDF library: "Save as PDF" in the print dialog produces selectable,
 * searchable text at the printer's own resolution, the layout is plain CSS
 * (so it stays in step with the rest of the admin), and it adds no dependency
 * to install or keep patched. @page and the print block in globals.css do the
 * rest — A4, repeating table headers, no chrome.
 */
export default function ReportsPage() {
  const [d, setD] = useState<MetricsExport | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    reports
      .metrics()
      .then(setD)
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load the report"))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => load(), [load]);

  const generated = d ? new Date(d.generatedAt) : null;
  const countryTotal = d?.countries.reduce((s, c) => s + c.views, 0) ?? 0;
  const topCountry = d?.countries[0];
  const hasCountryData = !!d && d.countries.some((c) => c.code !== "??" && c.views > 0);

  return (
    <Shell>
      {/* ---- screen-only controls ---- */}
      <div className="cms-head no-print">
        <div>
          <h1 className="page-h">Metrics report</h1>
          <p className="page-sub">
            Every published article and issue, with reader countries — print or save as PDF.
          </p>
        </div>
        <div style={{ display: "flex", gap: ".6rem" }}>
          <button className="btn btn--ghost" onClick={load} disabled={busy}>
            {busy ? "Loading…" : "↻ Refresh"}
          </button>
          <button className="btn" onClick={() => window.print()} disabled={!d}>
            ⤓ Export PDF
          </button>
        </div>
      </div>
      {err && <div className="err no-print">{err}</div>}
      {!d && !err && <div className="muted no-print">Building the report…</div>}

      {d && (
        <div className="report">
          {/* ---------- letterhead ---------- */}
          <header className="rpt-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rpt-logo" src="/logo.png" alt={PUBLISHER} />
            <div className="rpt-id">
              <div className="rpt-journal">{JOURNAL}</div>
              <div className="rpt-sub">
                International Scientific &amp; Technical Journal · {PUBLISHER}
              </div>
              <div className="rpt-issn">
                ISSN {ISSN} · E-ISSN {E_ISSN}
              </div>
            </div>
            <div className="rpt-meta">
              <div className="rpt-meta__k">Report generated</div>
              <div className="rpt-meta__v">
                {generated?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="rpt-meta__v rpt-meta__time">
                {generated?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </header>

          <h2 className="rpt-title">Publication &amp; readership metrics</h2>

          {/* ---------- totals ---------- */}
          <section className="rpt-section">
            <div className="rpt-stats">
              <Stat k="Published articles" v={d.totals.publishedArticles} />
              <Stat k="Issues" v={d.totals.issues} />
              <Stat k="Total views" v={d.totals.views} />
              <Stat k="Downloads" v={d.totals.downloads} />
              <Stat k="Citations" v={d.totals.citations} />
              <Stat k="Countries" v={d.countries.filter((c) => c.code !== "??").length} />
            </div>
          </section>

          {/* ---------- countries ---------- */}
          <section className="rpt-section">
            <h3 className="rpt-h">Readership by country</h3>
            {!hasCountryData ? (
              <p className="rpt-empty">
                No country data recorded yet. Reader countries are captured from the CDN on each view;
                events logged before that was switched on are grouped as <b>Unknown</b>. This section
                fills in as new traffic arrives.
              </p>
            ) : (
              <div className="rpt-bars">
                {d.countries.slice(0, 15).map((c) => {
                  const pct = countryTotal ? (c.views / countryTotal) * 100 : 0;
                  const rel = topCountry?.views ? (c.views / topCountry.views) * 100 : 0;
                  return (
                    <div className="rpt-bar" key={c.code}>
                      <div className="rpt-bar__label">
                        <span className="rpt-bar__flag">{countryFlag(c.code)}</span>
                        <span className="rpt-bar__name">{COUNTRY_NAMES[c.code] ?? c.code}</span>
                      </div>
                      <div className="rpt-bar__track">
                        <div className="rpt-bar__fill" style={{ width: `${Math.max(rel, 1)}%` }} />
                      </div>
                      <div className="rpt-bar__num">
                        {n(c.views)} <span className="rpt-bar__pct">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ---------- issues ---------- */}
          <section className="rpt-section rpt-break">
            <h3 className="rpt-h">
              Issues <small>{d.issues.length}</small>
            </h3>
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th className="num">Vol.</th>
                  <th className="num">No.</th>
                  <th>Status</th>
                  <th className="num">Articles</th>
                  <th className="num">Views</th>
                  <th className="num">Downloads</th>
                  <th className="num">Citations</th>
                </tr>
              </thead>
              <tbody>
                {d.issues.map((i) => (
                  <tr key={i.id}>
                    <td>{i.title}</td>
                    <td className="num">{i.volume ?? "—"}</td>
                    <td className="num">{i.number != null ? (ROMAN[i.number] ?? i.number) : "—"}</td>
                    <td>{i.status}</td>
                    <td className="num">{n(i.articles)}</td>
                    <td className="num">{n(i.views)}</td>
                    <td className="num">{n(i.downloads)}</td>
                    <td className="num">{n(i.citations)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ---------- articles ---------- */}
          <section className="rpt-section rpt-break">
            <h3 className="rpt-h">
              Published articles <small>{d.articles.length}</small>
            </h3>
            <table className="rpt-table rpt-table--articles">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Issue</th>
                  <th>Pages</th>
                  <th>DOI</th>
                  <th className="num">Views</th>
                  <th className="num">Dl.</th>
                  <th className="num">Cit.</th>
                </tr>
              </thead>
              <tbody>
                {d.articles.map((a) => (
                  <tr key={a.id}>
                    <td className="rpt-title-cell">{a.title}</td>
                    <td>{issueLabel(a.issueYear, a.issueNumber)}</td>
                    <td>{pages(a)}</td>
                    <td className="rpt-doi">{a.doi ?? "—"}</td>
                    <td className="num">{n(a.views)}</td>
                    <td className="num">{n(a.downloads)}</td>
                    <td className="num">{n(a.citations)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <footer className="rpt-foot">
            {JOURNAL} · {PUBLISHER} · ISSN {ISSN} · E-ISSN {E_ISSN} · msj.aztu.edu.az
          </footer>
        </div>
      )}
    </Shell>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rpt-stat">
      <div className="rpt-stat__v">{n(v)}</div>
      <div className="rpt-stat__k">{k}</div>
    </div>
  );
}
