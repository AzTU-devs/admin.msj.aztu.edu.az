"use client";
import Shell from "@/components/Shell";
import { CollectionEditor, Field } from "@/components/Cms";
import { cms, Announcement } from "@/lib/api";

const fields: Field[] = [
  { key: "title", label: "Title", type: "i18n", colInTable: true },
  { key: "body", label: "Body", type: "i18n-textarea" },
  { key: "imageUrl", label: "Image (URL or upload)", type: "image" },
  { key: "linkUrl", label: "Link URL", type: "url" },
  { key: "status", label: "Status", type: "select", options: ["PUBLISHED", "DRAFT"], colInTable: true },
  { key: "pinned", label: "Pinned", type: "boolean", colInTable: true },
  { key: "publishedAt", label: "Published (YYYY-MM-DD)", type: "text", colInTable: true },
  { key: "sortOrder", label: "Order", type: "number" },
];

export default function AnnouncementsAdmin() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Shell>
      <CollectionEditor<Announcement>
        title="Announcements"
        subtitle="Calls for papers and notices"
        fields={fields}
        api={cms.announcements as any}
        blank={() => ({ status: "PUBLISHED", pinned: false, sortOrder: 0, publishedAt: today, title: {}, body: {} })}
        rowTitle={(a) => a.title?.en || "announcement"}
      />
    </Shell>
  );
}
