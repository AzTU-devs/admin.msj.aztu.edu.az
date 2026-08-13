"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { editorial, cms, api, Issue, NewArticleInput, NewArticleAuthor, SUBJECT_AREAS } from "@/lib/api";

const EMPTY_AUTHOR: NewArticleAuthor = { firstName: "", lastName: "", email: "", affiliation: "", country: "", orcid: "", corresponding: false };

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const aid = Number(id);
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [v, setV] = useState<NewArticleInput | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    editorial.article(aid).then((a) => {
      setV({
        title: a.title, abstractText: a.abstractText || "", keywords: a.keywords || "",
        subjectArea: a.subjectArea || "", language: a.language || "en", doi: a.doi || "",
        issueId: a.issueId, pageStart: null, pageEnd: null, articleOrder: null,
        authors: a.authors.length
          ? a.authors.map((au) => ({
              firstName: au.firstName, lastName: au.lastName, email: au.email || "",
              affiliation: au.affiliation || "", country: au.country || "", orcid: au.orcid || "",
              corresponding: au.corresponding,
            }))
          : [{ ...EMPTY_AUTHOR, corresponding: true }],
      });
    }).catch((e) => setErr(e.message));
  }, [aid]);

  useEffect(() => { load(); cms.issues.list().then(setIssues).catch(() => setIssues([])); }, [load]);

  const set = (k: keyof NewArticleInput, val: any) => setV((p) => (p ? { ...p, [k]: val } : p));
  const setAuthor = (i: number, k: keyof NewArticleAuthor, val: any) =>
    setV((p) => (p ? { ...p, authors: p.authors.map((a, idx) => (idx === i ? { ...a, [k]: val } : a)) } : p));
  const addAuthor = () => setV((p) => (p ? { ...p, authors: [...p.authors, { ...EMPTY_AUTHOR }] } : p));
  const removeAuthor = (i: number) => setV((p) => (p ? { ...p, authors: p.authors.filter((_, idx) => idx !== i) } : p));
  const setCorresponding = (i: number) =>
    setV((p) => (p ? { ...p, authors: p.authors.map((a, idx) => ({ ...a, corresponding: idx === i })) } : p));

  async function save() {
    if (!v) return;
    if (!v.title.trim()) { setErr("Title is required."); return; }
    if (!v.authors.some((a) => a.firstName && a.lastName)) { setErr("Add at least one author (first and last name)."); return; }
    setErr(""); setBusy(true);
    try { await api.updateArticle(aid, v); router.push(`/articles/${aid}`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); setBusy(false); }
  }

  if (!v) return <Shell><div className="muted">{err ? <span className="err">{err}</span> : "Loading…"}</div></Shell>;

  return (
    <Shell>
      <a className="linkish" href={`/articles/${aid}`}>← Back to article</a>
      <h1 className="page-h" style={{ marginTop: ".5rem" }}>Edit article</h1>
      <p className="page-sub">Update the metadata and authors. (Page range / order and PDF are managed on the article page.)</p>
      {err && <div className="err">{err}</div>}

      <div className="panel">
        <div className="grid2">
          <div className="field"><label>Issue</label>
            <select value={v.issueId ?? ""} onChange={(e) => set("issueId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">— none —</option>
              {issues.map((i) => <option key={i.id} value={i.id}>{i.title} · {i.status}</option>)}
            </select></div>
          <div className="field"><label>Subject area</label>
            <select value={v.subjectArea || ""} onChange={(e) => set("subjectArea", e.target.value)}>
              <option value="">Select…</option>
              {SUBJECT_AREAS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>
        </div>
        <div className="field"><label>Title *</label>
          <input value={v.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div className="field"><label>Abstract</label>
          <textarea rows={5} value={v.abstractText || ""} onChange={(e) => set("abstractText", e.target.value)} /></div>
        <div className="field"><label>Keywords</label>
          <input value={v.keywords || ""} onChange={(e) => set("keywords", e.target.value)} placeholder="comma-separated" /></div>
        <div className="field"><label>DOI</label>
          <input value={v.doi || ""} onChange={(e) => set("doi", e.target.value)} placeholder="10.6141/… (leave blank if none)" /></div>
      </div>

      <div className="panel">
        <div style={{ fontWeight: 700, marginBottom: ".8rem" }}>Authors</div>
        {v.authors.map((a, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: ".8rem", marginBottom: ".6rem" }}>
            <div className="author-row">
              <input placeholder="First name" value={a.firstName} onChange={(e) => setAuthor(i, "firstName", e.target.value)} />
              <input placeholder="Last name" value={a.lastName} onChange={(e) => setAuthor(i, "lastName", e.target.value)} />
              <input placeholder="Email" value={a.email || ""} onChange={(e) => setAuthor(i, "email", e.target.value)} />
              <button type="button" className="btn btn--danger btn--sm" onClick={() => removeAuthor(i)} disabled={v.authors.length <= 1}>Remove</button>
            </div>
            <div className="author-row">
              <input placeholder="Affiliation" value={a.affiliation || ""} onChange={(e) => setAuthor(i, "affiliation", e.target.value)} />
              <input placeholder="Country" value={a.country || ""} onChange={(e) => setAuthor(i, "country", e.target.value)} />
              <input placeholder="ORCID" value={a.orcid || ""} onChange={(e) => setAuthor(i, "orcid", e.target.value)} />
              <label style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".8rem", whiteSpace: "nowrap" }}>
                <input type="radio" name="corresponding" checked={a.corresponding} onChange={() => setCorresponding(i)} style={{ width: "auto" }} /> Corresponding
              </label>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={addAuthor}>+ Add author</button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: ".7rem" }}>
        <button className="btn btn--ghost" onClick={() => router.push(`/articles/${aid}`)}>Cancel</button>
        <button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </Shell>
  );
}
