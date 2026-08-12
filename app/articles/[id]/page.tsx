"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import { editorial, api, cms, openFile, EditorialArticle, ReviewerUser, Issue, WF_STATUS_LABELS } from "@/lib/api";

const REC_LABELS: Record<string, string> = { ACCEPT: "Accept", MINOR_REVISION: "Minor revision", MAJOR_REVISION: "Major revision", REJECT: "Reject" };
const CAN_ASSIGN = ["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW", "WITH_EDITOR"];

export default function EditorialArticlePage() {
  const { id } = useParams<{ id: string }>();
  const aid = Number(id);
  const [a, setA] = useState<EditorialArticle | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [reviewers, setReviewers] = useState<ReviewerUser[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [issueId, setIssueId] = useState<string>("");

  const load = useCallback(() => { editorial.article(aid).then(setA).catch((e) => setErr(e.message)); }, [aid]);
  useEffect(() => {
    load();
    api.me().then((u) => setRoles(u.roles || [])).catch(() => {});
    editorial.reviewers().then(setReviewers).catch(() => {});
    cms.issues.list().then(setIssues).catch(() => {});
  }, [load]);

  const isEiC = roles.includes("EDITOR_IN_CHIEF") || roles.includes("ADMIN");

  async function doAssign() {
    if (selected.size === 0) { setErr("Select at least one reviewer."); return; }
    setBusy(true); setErr(""); setOk("");
    try { await editorial.assign(aid, [...selected], dueDate || null); setSelected(new Set()); setOk("Reviewers assigned."); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Assign failed"); } finally { setBusy(false); }
  }
  async function cancelAssignment(assignmentId: number) {
    try { await editorial.cancelAssignment(aid, assignmentId); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }
  async function decide(decision: string) {
    setBusy(true); setErr(""); setOk("");
    try { await editorial.decide(aid, decision, note, issueId ? Number(issueId) : null); setNote(""); setOk("Decision recorded."); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Decision failed"); } finally { setBusy(false); }
  }

  if (!a) return <Shell><div className="muted">Loading…</div></Shell>;
  const assignedIds = new Set(a.assignments.filter((x) => x.status !== "CANCELLED").map((x) => x.reviewerId));

  return (
    <Shell>
      <a className="linkish" href="/articles">← Submissions</a>
      <div className="cms-head" style={{ marginTop: ".5rem" }}>
        <div>
          <h1 className="page-h">{a.title}</h1>
          <p className="page-sub">#{a.id} · {a.subjectArea || "—"} · <span className={`pill ${a.status}`}>{WF_STATUS_LABELS[a.status] || a.status}</span></p>
        </div>
      </div>
      {err && <div className="err">{err}</div>}
      {ok && <div className="muted" style={{ color: "var(--ok)", marginBottom: "1rem" }}>{ok}</div>}

      <div className="wf-grid">
        {/* left: manuscript + reviews */}
        <div>
          <div className="panel">
            <div className="panel__h">Manuscript</div>
            <dl className="kv">
              <dt>Authors</dt><dd>{a.authors.map((au) => `${au.firstName} ${au.lastName}${au.corresponding ? " ✉" : ""}`).join("; ")}</dd>
              <dt>Keywords</dt><dd>{a.keywords || "—"}</dd>
              <dt>Submitted</dt><dd>{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : "—"}</dd>
            </dl>
            <p style={{ marginTop: "1rem", color: "var(--ink-2)", lineHeight: 1.6 }}>{a.abstractText}</p>
            <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {a.files.map((f) => (
                <button key={f.id} className="btn btn--ghost" onClick={() => openFile(f.id).catch((e) => setErr(e.message))}>↓ {f.kind.replace("_", " ")}</button>
              ))}
              {a.files.length === 0 && <span className="muted">No files.</span>}
            </div>
          </div>

          <div className="panel">
            <div className="panel__h">Reviews <small>{a.reviews.length}</small></div>
            {a.reviews.length === 0 && <p className="muted">No reviews submitted yet.</p>}
            {a.reviews.map((r) => (
              <div className="review-card" key={r.id}>
                <div className="review-card__h">
                  <b>{r.reviewerName}</b>
                  <span className={`rec-badge ${r.recommendation}`}>{REC_LABELS[r.recommendation] || r.recommendation}{r.score != null ? ` · ${r.score}/10` : ""}</span>
                </div>
                {r.commentsToAuthor && <><div className="muted pt-mono" style={{ fontSize: ".62rem", margin: ".4rem 0 .2rem" }}>TO AUTHOR</div>
                  <div className="rendered-html" dangerouslySetInnerHTML={{ __html: r.commentsToAuthor }} /></>}
                {r.commentsToEditor && <><div className="muted" style={{ fontSize: ".62rem", margin: ".6rem 0 .2rem", fontFamily: "var(--f-mono)" }}>TO EDITOR (confidential)</div>
                  <div className="rendered-html" dangerouslySetInnerHTML={{ __html: r.commentsToEditor }} /></>}
              </div>
            ))}
          </div>
        </div>

        {/* right: assign + decision + history */}
        <div>
          {CAN_ASSIGN.includes(a.status) && (
            <div className="panel">
              <div className="panel__h">Assign reviewers</div>
              {a.assignments.length > 0 && (
                <div style={{ marginBottom: ".8rem" }}>
                  {a.assignments.map((asg) => (
                    <div className="assign-row" key={asg.id}>
                      <span style={{ flex: 1 }}>{asg.reviewerName} · <span className="muted">{asg.status}{asg.reviewSubmitted ? " ✓" : ""}</span></span>
                      {!asg.reviewSubmitted && asg.status !== "CANCELLED" &&
                        <button className="link-danger" onClick={() => cancelAssignment(asg.id)}>cancel</button>}
                    </div>
                  ))}
                </div>
              )}
              <div className="checklist">
                {reviewers.map((rv) => (
                  <label key={rv.id} style={{ opacity: assignedIds.has(rv.id) ? .5 : 1 }}>
                    <input type="checkbox" disabled={assignedIds.has(rv.id)} checked={selected.has(rv.id)}
                      onChange={(e) => { const s = new Set(selected); e.target.checked ? s.add(rv.id) : s.delete(rv.id); setSelected(s); }} />
                    {rv.name}{assignedIds.has(rv.id) ? " (assigned)" : ""}
                  </label>
                ))}
                {reviewers.length === 0 && <div className="muted">No reviewers found.</div>}
              </div>
              <div className="field" style={{ marginTop: ".8rem" }}>
                <label>Due date (optional)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <button className="btn" disabled={busy} onClick={doAssign}>Assign selected</button>
            </div>
          )}

          {isEiC && a.status !== "PUBLISHED" && a.status !== "REJECTED" && (
            <div className="panel">
              <div className="panel__h">Editor-in-Chief decision</div>
              <div className="field">
                <label>Note to author (optional)</label>
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="field">
                <label>Publish into issue (optional)</label>
                <select value={issueId} onChange={(e) => setIssueId(e.target.value)}>
                  <option value="">— none —</option>
                  {issues.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
                </select>
              </div>
              <div className="decision-btns">
                <button className="btn btn--ok" disabled={busy} onClick={() => decide("PUBLISH")}>Publish (make live)</button>
                <button className="btn btn--warn" disabled={busy} onClick={() => decide("REVISE")}>Request revision</button>
                <button className="btn btn--reject" disabled={busy} onClick={() => decide("REJECT")}>Reject</button>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel__h">History</div>
            <ul className="review-timeline">
              {a.history.map((h, i) => (
                <li key={i}>
                  <span className="when">{new Date(h.at).toLocaleDateString()}</span>
                  <span>{WF_STATUS_LABELS[h.toStatus] || h.toStatus}{h.changedByName ? ` · ${h.changedByName}` : ""}{h.comment ? ` — ${h.comment}` : ""}</span>
                </li>
              ))}
              {a.history.length === 0 && <li className="muted">No history.</li>}
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}
