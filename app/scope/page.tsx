"use client";
import Shell from "@/components/Shell";
import { CollectionEditor, Field } from "@/components/Cms";
import { cms, ScopeTopic } from "@/lib/api";

const fields: Field[] = [
  { key: "icon", label: "Icon", type: "select", options: ["gear", "wave", "chip", "layer", "leaf", "trend", "tool"], colInTable: true },
  { key: "title", label: "Title", type: "i18n", colInTable: true },
  { key: "description", label: "Description", type: "i18n-textarea" },
  { key: "sortOrder", label: "Order", type: "number", colInTable: true },
  { key: "active", label: "Active", type: "boolean", colInTable: true },
];

export default function ScopeAdmin() {
  return (
    <Shell>
      <CollectionEditor<ScopeTopic>
        title="Scope Topics"
        subtitle="The subject areas shown in the “Where we publish” section"
        fields={fields}
        api={cms.scope as any}
        blank={() => ({ icon: "gear", sortOrder: 0, active: true, title: {}, description: {} })}
        rowTitle={(s) => s.title?.en || "topic"}
      />
    </Shell>
  );
}
