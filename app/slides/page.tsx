"use client";
import Shell from "@/components/Shell";
import { CollectionEditor, Field } from "@/components/Cms";
import { cms, HeroSlide } from "@/lib/api";

const fields: Field[] = [
  { key: "imageUrl", label: "Image (URL or upload)", type: "image", colInTable: true },
  { key: "caption", label: "Caption (topic)", type: "i18n", colInTable: true },
  { key: "altText", label: "Alt text", type: "text" },
  { key: "sortOrder", label: "Order", type: "number", colInTable: true },
  { key: "active", label: "Active", type: "boolean", colInTable: true },
];

export default function SlidesAdmin() {
  return (
    <Shell>
      <CollectionEditor<HeroSlide>
        title="Hero Slides"
        subtitle="The rotating images and captions at the top of the homepage"
        fields={fields}
        api={cms.slides as any}
        blank={() => ({ sortOrder: 0, active: true, caption: {} })}
        rowTitle={(s) => s.caption?.en || s.imageUrl}
      />
    </Shell>
  );
}
