"use client";
import Shell from "@/components/Shell";
import { CollectionEditor, Field } from "@/components/Cms";
import { cms, AuthorStep, AuthorTerm } from "@/lib/api";

const stepFields: Field[] = [
  { key: "stepNo", label: "No.", type: "text", colInTable: true },
  { key: "title", label: "Title", type: "i18n", colInTable: true },
  { key: "body", label: "Body", type: "i18n-textarea" },
  { key: "sortOrder", label: "Order", type: "number", colInTable: true },
];

const termFields: Field[] = [
  { key: "title", label: "Title", type: "i18n", colInTable: true },
  { key: "body", label: "Body", type: "i18n-textarea" },
  { key: "sortOrder", label: "Order", type: "number", colInTable: true },
];

export default function AuthorsAdmin() {
  return (
    <Shell>
      <CollectionEditor<AuthorStep>
        title="Author Steps"
        subtitle="“From manuscript to publication” — the numbered steps"
        fields={stepFields}
        api={cms.steps as any}
        blank={() => ({ sortOrder: 0, title: {}, body: {} })}
        rowTitle={(s) => s.title?.en || "step"}
      />
      <div style={{ height: "2.5rem" }} />
      <CollectionEditor<AuthorTerm>
        title="Author Terms"
        subtitle="Policy cards in the “For Authors” section"
        fields={termFields}
        api={cms.terms as any}
        blank={() => ({ sortOrder: 0, title: {}, body: {} })}
        rowTitle={(t) => t.title?.en || "term"}
      />
    </Shell>
  );
}
