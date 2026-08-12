"use client";
import Shell from "@/components/Shell";
import { CollectionEditor, Field } from "@/components/Cms";
import { cms, BoardMember } from "@/lib/api";

const fields: Field[] = [
  { key: "fullName", label: "Full name", type: "text", colInTable: true },
  { key: "section", label: "Section", type: "select", options: ["EDITOR_IN_CHIEF", "HONORARY", "BOARD"], colInTable: true },
  { key: "title", label: "Title / affiliation", type: "textarea" },
  { key: "photoUrl", label: "Photo (URL or upload)", type: "image" },
  { key: "orcidUrl", label: "ORCID URL", type: "url" },
  { key: "scopusUrl", label: "Scopus URL", type: "url" },
  { key: "email", label: "E-mail", type: "text" },
  { key: "country", label: "Country", type: "text" },
  { key: "sortOrder", label: "Order", type: "number", colInTable: true },
  { key: "active", label: "Active", type: "boolean", colInTable: true },
];

export default function BoardAdmin() {
  return (
    <Shell>
      <CollectionEditor<BoardMember>
        title="Editorial Board"
        subtitle="Members shown on the public site — editor-in-chief, honorary editor, and reviewers"
        fields={fields}
        api={cms.board as any}
        blank={() => ({ section: "BOARD", sortOrder: 0, active: true })}
        rowTitle={(m) => m.fullName}
      />
    </Shell>
  );
}
