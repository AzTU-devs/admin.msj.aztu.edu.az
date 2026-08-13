"use client";
import { useEffect, useState } from "react";
import { SubmissionInput, AuthorInput, SUBJECT_AREAS, OpenSection, submissions } from "@/lib/api";

const EMPTY_AUTHOR: AuthorInput = { firstName: "", lastName: "", email: "", affiliation: "", country: "", orcid: "", corresponding: false };

export default function SubmissionForm({ value, onChange, currentIssueLabel }:
  { value: SubmissionInput; onChange: (v: SubmissionInput) => void; currentIssueLabel?: string | null }) {
  const [sections, setSections] = useState<OpenSection[]>([]);
  useEffect(() => { submissions.openSections().then(setSections).catch(() => setSections([])); }, []);
  const knownSelected = sections.some((s) => s.id === value.issueId);
  const set = (k: keyof SubmissionInput, v: any) => onChange({ ...value, [k]: v });
  const setAuthor = (i: number, k: keyof AuthorInput, v: any) => {
    const authors = value.authors.map((a, idx) => idx === i ? { ...a, [k]: v } : a);
    onChange({ ...value, authors });
  };
  const addAuthor = () => onChange({ ...value, authors: [...value.authors, { ...EMPTY_AUTHOR }] });
  const removeAuthor = (i: number) => onChange({ ...value, authors: value.authors.filter((_, idx) => idx !== i) });
  const setCorresponding = (i: number) =>
    onChange({ ...value, authors: value.authors.map((a, idx) => ({ ...a, corresponding: idx === i })) });

  return (
    <>
      <div className="field"><label>Submit to section *</label>
        <select value={value.issueId ?? ""} onChange={(e) => set("issueId", e.target.value ? Number(e.target.value) : null)}>
          <option value="">Select an open section…</option>
          {/* keep the already-chosen section selectable even if its call has closed (e.g. during revision) */}
          {value.issueId && !knownSelected && currentIssueLabel &&
            <option value={value.issueId}>{currentIssueLabel} (current)</option>}
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}{s.submissionDeadline ? ` — deadline ${s.submissionDeadline}` : ""}
            </option>
          ))}
        </select>
        {sections.length === 0 && <div className="hint">No sections are open for submission right now — check back when a new year/section opens.</div>}
      </div>

      <div className="field"><label>Title *</label>
        <input value={value.title} onChange={(e) => set("title", e.target.value)} placeholder="Manuscript title" /></div>

      <div className="field"><label>Abstract *</label>
        <textarea rows={6} value={value.abstractText || ""} onChange={(e) => set("abstractText", e.target.value)} /></div>

      <div className="grid2">
        <div className="field"><label>Subject area *</label>
          <select value={value.subjectArea || ""} onChange={(e) => set("subjectArea", e.target.value)}>
            <option value="">Select…</option>
            {SUBJECT_AREAS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div className="field"><label>Language</label>
          <select value={value.language || "en"} onChange={(e) => set("language", e.target.value)}>
            <option value="en">English</option>
          </select>
          <div className="hint">The journal accepts English only.</div></div>
      </div>

      <div className="field"><label>Keywords *</label>
        <input value={value.keywords || ""} onChange={(e) => set("keywords", e.target.value)} placeholder="comma-separated" /></div>

      <div className="field"><label>Authors *</label>
        {value.authors.map((a, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: ".8rem", marginBottom: ".6rem" }}>
            <div className="author-row">
              <input placeholder="First name" value={a.firstName} onChange={(e) => setAuthor(i, "firstName", e.target.value)} />
              <input placeholder="Last name" value={a.lastName} onChange={(e) => setAuthor(i, "lastName", e.target.value)} />
              <input placeholder="Email" value={a.email || ""} onChange={(e) => setAuthor(i, "email", e.target.value)} />
              <button type="button" className="btn btn--danger btn--sm" onClick={() => removeAuthor(i)}
                disabled={value.authors.length <= 1}>Remove</button>
            </div>
            <div className="author-row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
              <input placeholder="Affiliation" value={a.affiliation || ""} onChange={(e) => setAuthor(i, "affiliation", e.target.value)} />
              <input placeholder="Country" value={a.country || ""} onChange={(e) => setAuthor(i, "country", e.target.value)} />
              <input placeholder="ORCID" value={a.orcid || ""} onChange={(e) => setAuthor(i, "orcid", e.target.value)} />
              <label style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".8rem", whiteSpace: "nowrap" }}>
                <input type="radio" name="corresponding" checked={a.corresponding} onChange={() => setCorresponding(i)} style={{ width: "auto" }} />
                Corresponding
              </label>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={addAuthor}>+ Add author</button>
      </div>
    </>
  );
}
