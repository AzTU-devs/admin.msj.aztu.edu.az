"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import { CollectionEditor, Field } from "@/components/Cms";
import { cms, Issue } from "@/lib/api";

const fields: Field[] = [
  { key: "title", label: "Title", type: "text", colInTable: true },
  { key: "year", label: "Year", type: "number", colInTable: true },
  { key: "number", label: "Number (1 or 2)", type: "number", colInTable: true },
  { key: "volume", label: "Volume", type: "number" },
  { key: "slug", label: "Slug", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["DRAFT", "OPEN", "PUBLISHED", "ARCHIVED"], colInTable: true },
  { key: "submissionDeadline", label: "Submission deadline", type: "date", colInTable: true },
  { key: "coverUrl", label: "Cover (URL or upload)", type: "image" },
  { key: "fullPdfUrl", label: "Full-issue PDF (URL or upload)", type: "file" },
  { key: "doi", label: "DOI", type: "text" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "publishedAt", label: "Published (YYYY-MM-DD)", type: "date" },
  { key: "sortOrder", label: "Order", type: "number" },
];

function OpenYearButton() {
  const [busy, setBusy] = useState(false);
  async function open() {
    const y = window.prompt("Open which year? This creates Number I and Number II as drafts.", String(new Date().getFullYear() + 1));
    if (!y) return;
    const year = Number(y);
    if (!year || year < 2000 || year > 2100) { alert("Enter a valid year, e.g. 2027"); return; }
    setBusy(true);
    try { await cms.openYear(year); window.location.reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to open year"); setBusy(false); }
  }
  return <button className="btn btn--ghost" disabled={busy} onClick={open}>{busy ? "Opening…" : "+ Open new year"}</button>;
}

export default function IssuesAdmin() {
  return (
    <Shell>
      <CollectionEditor<Issue>
        title="Issues"
        subtitle="Each year has two sections (Number I & II). Statuses: Draft → Open (accepting submissions until the deadline) → Published → Archived."
        fields={fields}
        api={cms.issues as any}
        blank={() => ({ status: "DRAFT", sortOrder: 0, year: new Date().getFullYear(), title: "", slug: "" })}
        rowTitle={(i) => i.title}
        extra={<OpenYearButton />}
      />
    </Shell>
  );
}
