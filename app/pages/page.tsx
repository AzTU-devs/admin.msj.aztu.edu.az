"use client";
import Shell from "@/components/Shell";
import { CollectionEditor, Field } from "@/components/Cms";
import { cms, ContentPage } from "@/lib/api";

const fields: Field[] = [
  { key: "slug", label: "Slug", type: "text", colInTable: true },
  { key: "title", label: "Title", type: "i18n", colInTable: true },
  { key: "body", label: "Body", type: "i18n-textarea" },
  { key: "status", label: "Status", type: "select", options: ["PUBLISHED", "DRAFT"], colInTable: true },
  { key: "sortOrder", label: "Order", type: "number", colInTable: true },
];

export default function PagesAdmin() {
  return (
    <Shell>
      <CollectionEditor<ContentPage>
        title="Content Pages"
        subtitle="About, Scope, Ethics, Author Guidelines, Open Access, Contact…"
        fields={fields}
        api={cms.pages as any}
        blank={() => ({ status: "PUBLISHED", sortOrder: 0, title: {}, body: {}, slug: "" })}
        rowTitle={(p) => p.title?.en || p.slug}
      />
    </Shell>
  );
}
