"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import SubmissionForm from "@/components/SubmissionForm";
import { submissions, SubmissionInput } from "@/lib/api";

export default function NewSubmission() {
  const router = useRouter();
  const [value, setValue] = useState<SubmissionInput>({
    title: "", abstractText: "", keywords: "", subjectArea: "", language: "en", issueId: null,
    authors: [{ firstName: "", lastName: "", email: "", affiliation: "", country: "", orcid: "", corresponding: true }],
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveDraft() {
    if (!value.title.trim()) { setErr("A title is required to start."); return; }
    if (!value.authors.some((a) => a.firstName && a.lastName)) { setErr("Add at least one author."); return; }
    setErr(""); setBusy(true);
    try {
      const created = await submissions.create(value);
      router.push(`/submissions/${created.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); setBusy(false); }
  }

  return (
    <Shell>
      <h1 className="page-h">New submission</h1>
      <p className="page-sub">Enter the manuscript details. You’ll upload the PDF and submit on the next step.</p>
      {err && <div className="err">{err}</div>}
      <div className="panel">
        <SubmissionForm value={value} onChange={setValue} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: ".7rem" }}>
        <button className="btn btn--ghost" onClick={() => router.push("/submissions")}>Cancel</button>
        <button className="btn" onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save draft & continue →"}</button>
      </div>
    </Shell>
  );
}
