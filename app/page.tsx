"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import AreaChart from "@/components/AreaChart";
import { api, Dashboard, MetricsOverview } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [d, setD] = useState<Dashboard | null>(null);
  const [m, setM] = useState<MetricsOverview | null>(null);
  const [err, setErr] = useState("");
  const [citBusy, setCitBusy] = useState(false);
  const [citNote, setCitNote] = useState("");

  const load = useCallback(
    () =>
      Promise.all([api.dashboard(), api.metrics(30)]).then(([dash, met]) => {
        setD(dash);
        setM(met);
      }),
    []
  );

  useEffect(() => {
    // This dashboard is editorial-only; send authors/reviewers to their own area.
    api.me().then((u) => {
      const roles = u.roles || [];
      if (!roles.some((r) => ["ADMIN", "EDITOR_IN_CHIEF", "EDITOR"].includes(r))) {
        router.replace(roles.includes("REVIEWER") ? "/reviews" : "/submissions");
        return;
      }
      return load();
    }).catch((e) => setErr(e.message));
  }, [router, load]);

  /**
   * Pull citation counts from Crossref now, rather than waiting for the weekly
   * Sunday-03:00 job. `sync` does two things in order: match any published
   * article that has no DOI against the journal's registered Crossref works by
   * title, then read `is-referenced-by-count` for every article that has one.
   * The DOI step matters — an article without a DOI is invisible to the count
   * refresh, so a run that reports `0/0` means no DOIs, not zero citations.
   */
  async function syncCitations() {
    setCitBusy(true);
    setErr("");
    setCitNote("");
    try {
      const r = await api.syncCitations();
      setCitNote(
        `Crossref: ${r.dois.matched} DOI${r.dois.matched === 1 ? "" : "s"} newly matched ` +
          `(${r.dois.alreadyHadDoi} already had one, ${r.dois.unmatched} unmatched) · ` +
          `citations updated for ${r.citations.updated}/${r.citations.articles} articles` +
          `${r.citations.failed ? `, ${r.citations.failed} failed` : ""} · ` +
          `${r.citations.totalCitations} citations in total.`
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Crossref sync failed");
    } finally {
      setCitBusy(false);
    }
  }

  return (
    <Shell>
      <div className="cms-head">
        <div>
          <h1 className="page-h">Dashboard</h1>
          <p className="page-sub">Machine Science · editorial overview</p>
        </div>
        <button className="btn btn--ghost" disabled={citBusy} onClick={syncCitations}
          title="Match missing DOIs and re-read citation counts from Crossref">
          {citBusy ? "Syncing…" : "↻ Refresh citations"}
        </button>
      </div>
      {err && <div className="err">{err}</div>}
      {citNote && <div className="ok-msg">{citNote}</div>}

      {d && (
        <div className="cards">
          <Stat k="Submissions" v={d.totalArticles} />
          <Stat k="Published" v={d.publishedArticles} accent />
          <Stat k="Registered users" v={d.totalUsers} />
          <Stat k="Total views" v={d.totalViews} />
          <Stat k="Total downloads" v={d.totalDownloads} />
          <Stat k="Citations" v={d.totalCitations} accent />
        </div>
      )}

      <div className="panel">
        <div className="panel__h">Traffic <small>last 30 days</small></div>
        {m ? <AreaChart data={m.series} /> : <div className="muted">Loading chart…</div>}
      </div>

      <div className="panel">
        <div className="panel__h">Pipeline by status</div>
        {d && (
          <div className="cards">
            {Object.entries(d.articlesByStatus).map(([s, n]) => (
              <div className="card" key={s}>
                <div className="card__k">{s.replaceAll("_", " ")}</div>
                <div className="card__v">{n}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__h">Most-read articles</div>
        <table className="table">
          <thead><tr><th>Article</th><th>Views</th><th>Downloads</th><th>Citations</th></tr></thead>
          <tbody>
            {m?.topArticles.map((a) => (
              <tr key={a.id}>
                <td className="t-title">{a.title}</td>
                <td>{a.views.toLocaleString()}</td>
                <td>{a.downloads.toLocaleString()}</td>
                <td>{a.citations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function Stat({ k, v, accent }: { k: string; v: number; accent?: boolean }) {
  return (
    <div className="card">
      <div className="card__k">{k}</div>
      <div className={`card__v${accent ? " accent" : ""}`}>{v.toLocaleString()}</div>
    </div>
  );
}
