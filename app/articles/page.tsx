"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Link from "next/link";
import { api, cms, ArticleRow, ARTICLE_STATUSES } from "@/lib/api";

export default function ArticlesPage() {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(() => {
    api.articles(filter || undefined, 0, 50)
      .then((p) => { setRows(p.content); setTotal(p.totalElements); })
      .catch((e) => setErr(e.message));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(id: number, status: string) {
    setSavingId(id);
    setErr("");
    try {
      await api.updateStatus(id, status);
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function uploadPdf(id: number, file: File) {
    setErr("");
    try { await cms.uploadArticleFile(id, file); setNote(`PDF uploaded for #${id}`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
  }
  async function setPdfUrl(id: number) {
    const url = window.prompt("Enter the PDF URL for this article:");
    if (!url) return;
    setErr("");
    try { await cms.setArticlePdfUrl(id, url); setNote(`PDF URL set for #${id}`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to set URL"); }
  }
  async function remove(id: number, title: string) {
    if (!window.confirm(`Delete "${title || "this submission"}"?\nThis permanently removes the article and all its files, reviews, and history.`)) return;
    setErr("");
    try {
      await api.deleteArticle(id);
      setRows((rs) => rs.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setNote(`Deleted #${id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Delete failed"); }
  }
  const [note, setNote] = useState("");
  const [citBusy, setCitBusy] = useState(false);
  async function syncCrossref() {
    setCitBusy(true); setErr(""); setNote("");
    try {
      const r = await api.syncCitations();
      setNote(`Crossref sync — matched ${r.dois.matched} new DOIs (${r.dois.alreadyHadDoi} already had one, ${r.dois.unmatched} unmatched); citations updated for ${r.citations.updated}/${r.citations.articles} articles${r.citations.totalCitations ? `, ${r.citations.totalCitations} total` : ""}.`);
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Crossref sync failed"); }
    finally { setCitBusy(false); }
  }

  return (
    <Shell>
      <h1 className="page-h">Submissions</h1>
      <p className="page-sub">{total} manuscripts · advance each through the editorial workflow</p>
      {err && <div className="err">{err}</div>}
      {note && <div className="muted" style={{ color: "var(--ok)", marginBottom: "1rem" }}>{note}</div>}

      <div className="panel">
        <div className="panel__h">
          <span>All submissions</span>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            <button className="btn btn--ghost btn--sm" disabled={citBusy} onClick={syncCrossref}
              title="Match missing DOIs from Crossref by title, then fetch citation counts">
              {citBusy ? "Syncing…" : "↻ Sync from Crossref"}
            </button>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All statuses</option>
              {ARTICLE_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
            </select>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr><th>#</th><th>Title</th><th>Subject</th><th>Status</th><th>Citations</th><th>Change to</th><th>PDF</th><th>Manage</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.id}</td>
                <td className="t-title">
                  <Link className="linkish" href={`/articles/${r.id}`}>{r.title}</Link>
                  {r.doi && <div className="muted" style={{ fontFamily: "var(--f-mono)", fontSize: ".7rem" }}>{r.doi}</div>}
                </td>
                <td className="muted">{r.subjectArea || "—"}</td>
                <td><span className={`pill ${r.status}`}>{r.status.replaceAll("_", " ")}</span></td>
                <td>
                  <b style={{ fontSize: "1rem" }}>{r.citations}</b>
                  <div className="muted" style={{ fontSize: ".66rem" }}>{r.views} views · {r.downloads} dl</div>
                </td>
                <td>
                  <select
                    defaultValue=""
                    disabled={savingId === r.id}
                    onChange={(e) => { if (e.target.value) changeStatus(r.id, e.target.value); e.target.value = ""; }}
                  >
                    <option value="">{savingId === r.id ? "Saving…" : "Set status…"}</option>
                    {ARTICLE_STATUSES.filter((s) => s !== r.status).map((s) => (
                      <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="pdf-cell">
                    <a className="btn btn--ghost" href={`/api/v1/articles/${r.id}/pdf`} target="_blank" rel="noopener">View</a>
                    <label className="btn btn--ghost" style={{ cursor: "pointer" }}>
                      Upload
                      <input type="file" accept="application/pdf,.pdf" hidden
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(r.id, f); e.target.value = ""; }} />
                    </label>
                    <button className="btn btn--ghost" onClick={() => setPdfUrl(r.id)}>URL</button>
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                    <Link className="btn btn--ghost btn--sm" href={`/articles/${r.id}/edit`}>Edit</Link>
                    <button className="btn btn--danger btn--sm" onClick={() => remove(r.id, r.title)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="muted">No submissions match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
