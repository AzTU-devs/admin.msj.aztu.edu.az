"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import RichText from "@/components/RichText";
import { reviewer, openFile, AssignmentDetail, RECOMMENDATIONS, WF_STATUS_LABELS } from "@/lib/api";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const aid = Number(id);
  const router = useRouter();
  const [d, setD] = useState<AssignmentDetail | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [recommendation, setRecommendation] = useState("");
  const [score, setScore] = useState<string>("");
  const [toAuthor, setToAuthor] = useState("");
  const [toEditor, setToEditor] = useState("");

  const load = useCallback(() => {
    reviewer.assignment(aid).then((det) => {
      setD(det);
      if (det.myReview) {
        setRecommendation(det.myReview.recommendation);
        setScore(det.myReview.score != null ? String(det.myReview.score) : "");
        setToAuthor(det.myReview.commentsToAuthor || "");
        setToEditor(det.myReview.commentsToEditor || "");
      }
    }).catch((e) => setErr(e.message));
  }, [aid]);
  useEffect(() => { load(); }, [load]);

  async function respond(accept: boolean) {
    setBusy(true); setErr("");
    try { await reviewer.respond(aid, accept); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  async function submit() {
    if (!recommendation) { setErr("Choose a recommendation."); return; }
    setBusy(true); setErr("");
    try {
      await reviewer.submitReview(aid, { recommendation, score: score ? Number(score) : null, commentsToAuthor: toAuthor, commentsToEditor: toEditor });
      router.push("/reviews");
    } catch (e) { setErr(e instanceof Error ? e.message : "Submit failed"); setBusy(false); }
  }

  if (!d) return <Shell><div className="muted">Loading…</div></Shell>;
  const a = d.article;
  const asg = d.assignment;
  const submitted = asg.reviewSubmitted;
  const invited = asg.assignmentStatus === "INVITED";

  return (
    <Shell>
      <a className="linkish" href="/reviews">← My reviews</a>
      <h1 className="page-h" style={{ marginTop: ".5rem" }}>{a.title}</h1>
      <p className="page-sub">{a.subjectArea} · <span className={`pill ${a.status}`}>{WF_STATUS_LABELS[a.status] || a.status}</span></p>
      {err && <div className="err">{err}</div>}

      <div className="wf-grid">
        <div>
          <div className="panel">
            <div className="panel__h">Manuscript</div>
            <dl className="kv">
              <dt>Authors</dt><dd>{a.authors.map((au) => `${au.firstName} ${au.lastName}`).join("; ")}</dd>
              <dt>Keywords</dt><dd>{a.keywords}</dd>
            </dl>
            <p style={{ marginTop: "1rem", color: "var(--ink-2)", lineHeight: 1.6 }}>{a.abstractText}</p>
            <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {a.files.map((f) => (
                <button key={f.id} className="btn btn--ghost" onClick={() => openFile(f.id).catch((e) => setErr(e.message))}>
                  ↓ {f.kind.replace("_", " ")}
                </button>
              ))}
              {a.files.length === 0 && <span className="muted">No files attached.</span>}
            </div>
          </div>

          {invited && (
            <div className="panel">
              <div className="panel__h">Review invitation</div>
              <p className="muted">Will you review this manuscript?</p>
              <div style={{ display: "flex", gap: ".6rem" }}>
                <button className="btn btn--ok" disabled={busy} onClick={() => respond(true)}>Accept</button>
                <button className="btn btn--reject" disabled={busy} onClick={() => respond(false)}>Decline</button>
              </div>
            </div>
          )}

          {!invited && (
            <div className="panel">
              <div className="panel__h">{submitted ? "Your review" : "Write your review"}</div>
              <div className="field">
                <label>Recommendation</label>
                <select value={recommendation} disabled={submitted} onChange={(e) => setRecommendation(e.target.value)}>
                  <option value="">Select…</option>
                  {RECOMMENDATIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="field" style={{ maxWidth: 160 }}>
                <label>Score (1–10, optional)</label>
                <input type="number" min={1} max={10} value={score} disabled={submitted} onChange={(e) => setScore(e.target.value)} />
              </div>
              <div className="field">
                <label>Comments to the author</label>
                {submitted ? <div className="rendered-html" dangerouslySetInnerHTML={{ __html: toAuthor }} />
                  : <RichText value={toAuthor} onChange={setToAuthor} placeholder="Feedback the author will see…" />}
              </div>
              <div className="field">
                <label>Comments to the editor (confidential)</label>
                {submitted ? <div className="rendered-html" dangerouslySetInnerHTML={{ __html: toEditor }} />
                  : <RichText value={toEditor} onChange={setToEditor} placeholder="Only the editors see this…" />}
              </div>
              {!submitted && <button className="btn" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit review"}</button>}
              {submitted && <div className="ok-msg" style={{ background: "transparent", color: "var(--ok)" }}>✓ Review submitted{d.myReview?.submittedAt ? ` on ${new Date(d.myReview.submittedAt).toLocaleDateString()}` : ""}.</div>}
            </div>
          )}
        </div>

        <div>
          <div className="panel">
            <div className="panel__h">Assignment</div>
            <dl className="kv">
              <dt>Status</dt><dd><span className={`pill ${asg.assignmentStatus}`}>{asg.assignmentStatus}</span></dd>
              <dt>Due</dt><dd>{asg.dueDate || "—"}</dd>
              <dt>Invited</dt><dd>{asg.invitedAt ? new Date(asg.invitedAt).toLocaleDateString() : "—"}</dd>
            </dl>
          </div>
        </div>
      </div>
    </Shell>
  );
}
