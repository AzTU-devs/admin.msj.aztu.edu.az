"use client";
import Shell from "@/components/Shell";
import { CollectionEditor, Field } from "@/components/Cms";
import { cms, Issue } from "@/lib/api";

const fields: Field[] = [
  { key: "title", label: "Title", type: "text", colInTable: true },
  { key: "year", label: "Year", type: "number", colInTable: true },
  { key: "volume", label: "Volume", type: "number" },
  { key: "number", label: "Number", type: "number", colInTable: true },
  { key: "slug", label: "Slug", type: "text", colInTable: true },
  { key: "doi", label: "DOI", type: "text" },
  { key: "coverUrl", label: "Cover (URL or upload)", type: "image" },
  { key: "fullPdfUrl", label: "Full-issue PDF (URL or upload)", type: "file" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "status", label: "Status", type: "select", options: ["PUBLISHED", "DRAFT"], colInTable: true },
  { key: "publishedAt", label: "Published (YYYY-MM-DD)", type: "text" },
  { key: "sortOrder", label: "Order", type: "number", colInTable: true },
];

export default function IssuesAdmin() {
  return (
    <Shell>
      <CollectionEditor<Issue>
        title="Issues"
        subtitle="Volumes and numbers of the journal (the archive)"
        fields={fields}
        api={cms.issues as any}
        blank={() => ({ status: "DRAFT", sortOrder: 0, year: new Date().getFullYear(), title: "", slug: "" })}
        rowTitle={(i) => i.title}
      />
    </Shell>
  );
}
