"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import AreaChart from "@/components/AreaChart";
import { api, Dashboard, MetricsOverview } from "@/lib/api";

export default function DashboardPage() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [m, setM] = useState<MetricsOverview | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([api.dashboard(), api.metrics(30)])
      .then(([dash, met]) => { setD(dash); setM(met); })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <Shell>
      <h1 className="page-h">Dashboard</h1>
      <p className="page-sub">Machine Science · editorial overview</p>
      {err && <div className="err">{err}</div>}

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
