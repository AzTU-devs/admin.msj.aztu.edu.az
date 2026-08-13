"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { submissions, SubmissionSummary, WF_STATUS_LABELS } from "@/lib/api";

export default function MySubmissions() {
  const [items, setItems] = useState<SubmissionSummary[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => { submissions.listMine().then(setItems).catch((e) => setErr(e.message)); }, []);

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <h1 className="page-h">My submissions</h1>
          <p className="page-sub">Track your manuscripts through review and publication.</p>
        </div>
        <Link href="/submissions/new" className="btn" style={{ whiteSpace: "nowrap" }}>+ New submission</Link>
      </div>
      {err && <div className="err">{err}</div>}

      {items && items.length === 0 && (
        <div className="panel"><p className="muted" style={{ margin: 0 }}>
          You haven’t submitted anything yet. <Link className="linkish" href="/submissions/new">Start a new submission →</Link></p></div>
      )}

      {items?.map((s) => (
        <Link key={s.id} href={`/submissions/${s.id}`} className="panel" style={{ display: "block" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{s.title || "(untitled draft)"}</div>
              <div className="muted" style={{ fontFamily: "var(--f-mono)" }}>
                {s.subjectArea || "—"} · updated {new Date(s.updatedAt).toLocaleDateString()}
              </div>
            </div>
            <span className={`pill ${s.status}`}>{WF_STATUS_LABELS[s.status] || s.status}</span>
          </div>
        </Link>
      ))}

      {!items && !err && <div className="muted">Loading…</div>}
    </Shell>
  );
}
