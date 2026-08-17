"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import SubmissionForm from "@/components/SubmissionForm";
import { submissions, SubmissionDetail, SubmissionInput, WF_STATUS_LABELS, REC_LABELS, openFile } from "@/lib/api";

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sid = Number(id);
  const [d, setD] = useState<SubmissionDetail | null>(null);
  const [form, setForm] = useState<SubmissionInput | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("MANUSCRIPT");
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);

  const load = useCallback(() => {
    submissions.get(sid).then((det) => {
      setD(det);
      setForm({
        title: det.title, abstractText: det.abstractText || "", keywords: det.keywords || "",
        subjectArea: det.subjectArea || "", language: det.language || "en", issueId: det.issueId,
        authors: det.authors.map((a) => ({ ...a })),
      });
    }).catch((e) => setErr(e.message));
  }, [sid]);
  useEffect(() => { load(); }, [load]);

  async function saveMeta() {
    if (!form) return;
    setBusy(true); setErr(""); setOk("");
    try { await submissions.update(sid, form); setOk("Saved."); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  }
  async function upload(file: File) {
    setErr(""); setOk(""); setPct(0); setUploading(true);
    try { await submissions.uploadFile(sid, file, kind, (p) => setPct(p)); setOk("File uploaded."); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); setPct(0); }
  }
  async function removeFile(fileId: number) {
    setErr("");
    try { await submissions.deleteFile(sid, fileId); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Delete failed"); }
  }
  async function submitForReview() {
    setBusy(true); setErr(""); setOk("");
    try { const det = await submissions.submit(sid); setD(det); setOk("Submitted for review."); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Submit failed"); }
    finally { setBusy(false); }
  }

  if (!d || !form) return <Shell><div className="muted">Loading…</div></Shell>;
  const editable = d.canEdit;
  const hasManuscript = d.files.some((f) => f.kind === "MANUSCRIPT");

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <h1 className="page-h" style={{ marginBottom: ".2rem" }}>{d.title || "(untitled draft)"}</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>Submission #{d.id}{d.doi ? ` · ${d.doi}` : ""}</p>
        </div>
        <span className={`pill ${d.status}`}>{WF_STATUS_LABELS[d.status] || d.status}</span>
      </div>

      {err && <div className="err" style={{ marginTop: "1rem" }}>{err}</div>}
      {ok && <div className="ok-msg" style={{ marginTop: "1rem" }}>{ok}</div>}

      {d.status === "REVISION_REQUESTED" && (
        <div className="panel" style={{ borderColor: "rgba(210,167,72,.45)" }}>
          <div style={{ fontWeight: 700 }}>Revision requested</div>
          {d.editorNote && <p style={{ margin: ".4rem 0 0" }}>{d.editorNote}</p>}
          <p className="muted" style={{ marginBottom: 0 }}>Update your manuscript and details below, then resubmit.</p>
        </div>
      )}

      {/* reviews visible to the author */}
      {d.reviews.length > 0 && (
        <div className="panel">
          <div style={{ fontWeight: 700, marginBottom: ".8rem" }}>Reviewer feedback</div>
          {d.reviews.map((r, i) => (
            <div className="review-card" key={i}>
              <div className="review-card__h">
                <span className={`rec-badge ${r.recommendation}`}>{REC_LABELS[r.recommendation] || r.recommendation}</span>
              </div>
              {r.commentsToAuthor && <div className="rendered-html" dangerouslySetInnerHTML={{ __html: r.commentsToAuthor }} />}
            </div>
          ))}
        </div>
      )}

      {/* metadata */}
      <div className="panel">
        <div style={{ fontWeight: 700, marginBottom: "1rem" }}>Manuscript details</div>
        {editable ? <SubmissionForm value={form} onChange={setForm} currentIssueLabel={d.issueTitle} />
          : <ReadOnly d={d} />}
        {editable && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button className="btn btn--ghost" onClick={saveMeta} disabled={busy}>Save details</button>
          </div>
        )}
      </div>

      {/* files */}
      <div className="panel">
        <div style={{ fontWeight: 700, marginBottom: ".6rem" }}>Files</div>
        {d.files.length === 0 && <p className="muted">No files uploaded yet.</p>}
        {d.files.map((f) => (
          <div className="file-row" key={f.id}>
            <span><b>{f.kind.replace("_", " ")}</b> · <a className="linkish" style={{ cursor: "pointer" }} onClick={() => openFile(f.id).catch((e) => setErr(e.message))}>{f.originalName}</a>
              {f.sizeBytes ? <span className="muted"> · {(f.sizeBytes / 1024).toFixed(0)} KB</span> : null}</span>
            {editable && <button className="btn btn--danger btn--sm" onClick={() => removeFile(f.id)}>Remove</button>}
          </div>
        ))}
        {editable && (
          <div style={{ display: "flex", marginTop: "1rem", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: "auto" }}>
              <option value="MANUSCRIPT">Manuscript (PDF)</option>
              <option value="SUPPLEMENTARY">Supplementary</option>
              <option value="COVER_LETTER">Cover letter</option>
            </select>
            <button className="btn btn--ghost btn--sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? `Uploading… ${pct}%` : "Upload file"}
            </button>
            <input ref={fileInput} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            {uploading && (
              <span className="pdf-bar" style={{ flex: 1, minWidth: 140 }} aria-label={`Upload ${pct}% complete`}>
                <span className="pdf-bar__fill" style={{ width: `${pct}%` }} />
              </span>
            )}
            {!uploading && !hasManuscript && <span className="muted">A manuscript PDF is required to submit.</span>}
          </div>
        )}
      </div>

      {editable && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: ".7rem" }}>
          <button className="btn" onClick={submitForReview} disabled={busy || !hasManuscript}>
            {d.status === "REVISION_REQUESTED" ? "Resubmit for review" : "Submit for review"}
          </button>
        </div>
      )}

      {/* timeline */}
      <div className="panel">
        <div style={{ fontWeight: 700, marginBottom: ".6rem" }}>History</div>
        <ul className="review-timeline">
          {d.history.map((h, i) => (
            <li key={i}>
              <span className="when">{new Date(h.at).toLocaleDateString()}</span>
              <span>{WF_STATUS_LABELS[h.toStatus] || h.toStatus}{h.comment ? ` — ${h.comment}` : ""}</span>
            </li>
          ))}
          {d.history.length === 0 && <li className="muted">No changes yet.</li>}
        </ul>
      </div>
    </Shell>
  );
}

function ReadOnly({ d }: { d: SubmissionDetail }) {
  return (
    <dl className="kv">
      {d.issueTitle && <><dt>Section</dt><dd>{d.issueTitle}</dd></>}
      <dt>Abstract</dt><dd>{d.abstractText}</dd>
      <dt>Keywords</dt><dd>{d.keywords}</dd>
      <dt>Subject</dt><dd>{d.subjectArea}</dd>
      <dt>Authors</dt><dd>{d.authors.map((a) => `${a.firstName} ${a.lastName}${a.corresponding ? " ✉" : ""}`).join("; ")}</dd>
    </dl>
  );
}
