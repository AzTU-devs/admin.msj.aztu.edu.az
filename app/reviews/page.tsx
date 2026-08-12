"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { reviewer, AssignmentSummary, WF_STATUS_LABELS } from "@/lib/api";

export default function ReviewsPage() {
  const [rows, setRows] = useState<AssignmentSummary[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => { reviewer.assignments().then(setRows).catch((e) => setErr(e.message)); }, []);

  const pending = rows?.filter((r) => !r.reviewSubmitted && r.assignmentStatus !== "DECLINED") || [];
  const done = rows?.filter((r) => r.reviewSubmitted) || [];

  return (
    <Shell>
      <h1 className="page-h">My Reviews</h1>
      <p className="page-sub">Manuscripts assigned to you for peer review.</p>
      {err && <div className="err">{err}</div>}

      <div className="panel">
        <div className="panel__h">To review <small>{pending.length}</small></div>
        <table className="table">
          <thead><tr><th>Manuscript</th><th>Subject</th><th>Invitation</th><th>Due</th><th></th></tr></thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id}>
                <td className="t-title">{r.articleTitle}</td>
                <td className="muted">{r.subjectArea || "—"}</td>
                <td><span className={`pill ${r.assignmentStatus}`}>{r.assignmentStatus}</span></td>
                <td className="muted">{r.dueDate || "—"}</td>
                <td><Link className="btn" href={`/reviews/${r.id}`}>Open</Link></td>
              </tr>
            ))}
            {rows && pending.length === 0 && <tr><td colSpan={5} className="muted">Nothing to review right now.</td></tr>}
          </tbody>
        </table>
      </div>

      {done.length > 0 && (
        <div className="panel">
          <div className="panel__h">Completed <small>{done.length}</small></div>
          <table className="table">
            <thead><tr><th>Manuscript</th><th>Article status</th><th></th></tr></thead>
            <tbody>
              {done.map((r) => (
                <tr key={r.id}>
                  <td className="t-title">{r.articleTitle}</td>
                  <td><span className={`pill ${r.articleStatus}`}>{WF_STATUS_LABELS[r.articleStatus || ""] || r.articleStatus}</span></td>
                  <td><Link className="btn btn--ghost" href={`/reviews/${r.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!rows && !err && <div className="muted">Loading…</div>}
    </Shell>
  );
}
