"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api, cms, Issue, NewArticleInput, NewArticleAuthor, SUBJECT_AREAS } from "@/lib/api";

const EMPTY_AUTHOR: NewArticleAuthor = { firstName: "", lastName: "", email: "", affiliation: "", country: "", orcid: "", corresponding: false };

export default function AddArticlePage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [v, setV] = useState<NewArticleInput>({
    title: "", abstractText: "", keywords: "", subjectArea: "", language: "en", doi: "",
    issueId: null, pageStart: null, pageEnd: null, articleOrder: null,
    authors: [{ ...EMPTY_AUTHOR, corresponding: true }],
  });
  const [pdf, setPdf] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const pdfInput = useRef<HTMLInputElement>(null);

  useEffect(() => { cms.issues.list().then(setIssues).catch(() => setIssues([])); }, []);

  const set = (k: keyof NewArticleInput, val: any) => setV((p) => ({ ...p, [k]: val }));
  const setAuthor = (i: number, k: keyof NewArticleAuthor, val: any) =>
    setV((p) => ({ ...p, authors: p.authors.map((a, idx) => (idx === i ? { ...a, [k]: val } : a)) }));
  const addAuthor = () => setV((p) => ({ ...p, authors: [...p.authors, { ...EMPTY_AUTHOR }] }));
  const removeAuthor = (i: number) => setV((p) => ({ ...p, authors: p.authors.filter((_, idx) => idx !== i) }));
  const setCorresponding = (i: number) =>
    setV((p) => ({ ...p, authors: p.authors.map((a, idx) => ({ ...a, corresponding: idx === i })) }));

  async function save() {
    if (!v.title.trim()) { setErr("Title is required."); return; }
    if (!v.issueId) { setErr("Choose an issue to publish into."); return; }
    if (!v.authors.some((a) => a.firstName && a.lastName)) { setErr("Add at least one author (first and last name)."); return; }
    setErr(""); setBusy(true);
    try {
      const { id } = await api.createArticle(v);
      if (pdf) {
        try { await cms.uploadArticleFile(id, pdf, "PUBLISHED_PDF"); }
        catch (e) { setErr("Article created, but the PDF upload failed: " + (e instanceof Error ? e.message : "")); setBusy(false); return; }
      }
      router.push(`/articles/${id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not create the article"); setBusy(false); }
  }

  return (
    <Shell>
      <h1 className="page-h">Add article</h1>
      <p className="page-sub">Publish an article directly into an issue — bypasses the author-submission workflow.</p>
      {err && <div className="err">{err}</div>}

      <div className="panel">
        <div className="grid2">
          <div className="field"><label>Issue *</label>
            <select value={v.issueId ?? ""} onChange={(e) => set("issueId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select an issue…</option>
              {issues.map((i) => <option key={i.id} value={i.id}>{i.title} · {i.status}</option>)}
            </select></div>
          <div className="field"><label>Subject area</label>
            <select value={v.subjectArea || ""} onChange={(e) => set("subjectArea", e.target.value)}>
              <option value="">Select…</option>
              {SUBJECT_AREAS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>
        </div>
        <div className="field"><label>Title *</label>
          <input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Article title" /></div>
        <div className="field"><label>Abstract</label>
          <textarea rows={5} value={v.abstractText || ""} onChange={(e) => set("abstractText", e.target.value)} /></div>
        <div className="field"><label>Keywords</label>
          <input value={v.keywords || ""} onChange={(e) => set("keywords", e.target.value)} placeholder="comma-separated" /></div>
        <div className="grid2">
          <div className="field"><label>DOI</label>
            <input value={v.doi || ""} onChange={(e) => set("doi", e.target.value)} placeholder="10.6141/…" /></div>
          <div className="field"><label>Order in issue</label>
            <input type="number" value={v.articleOrder ?? ""} onChange={(e) => set("articleOrder", e.target.value ? Number(e.target.value) : null)} /></div>
        </div>
        <div className="grid2">
          <div className="field"><label>Page start</label>
            <input type="number" value={v.pageStart ?? ""} onChange={(e) => set("pageStart", e.target.value ? Number(e.target.value) : null)} /></div>
          <div className="field"><label>Page end</label>
            <input type="number" value={v.pageEnd ?? ""} onChange={(e) => set("pageEnd", e.target.value ? Number(e.target.value) : null)} /></div>
        </div>
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

      <div className="panel">
        <div style={{ fontWeight: 700, marginBottom: ".6rem" }}>Published PDF</div>
        <div style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn--ghost btn--sm" onClick={() => pdfInput.current?.click()}>Choose PDF</button>
          <input ref={pdfInput} type="file" accept="application/pdf,.pdf" hidden
            onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
          <span className="muted">{pdf ? pdf.name : "Optional — you can also add the PDF later from the article page."}</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: ".7rem" }}>
        <button className="btn btn--ghost" onClick={() => router.push("/articles")}>Cancel</button>
        <button className="btn" onClick={save} disabled={busy}>{busy ? "Publishing…" : "Publish article"}</button>
      </div>
    </Shell>
  );
}
