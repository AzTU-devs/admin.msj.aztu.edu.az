"use client";
import { useEffect, useRef } from "react";

/**
 * Minimal dependency-free rich-text editor (contentEditable + toolbar).
 * Emits HTML; the backend sanitizes it (jsoup) before storing.
 */
export default function RichText({ value, onChange, placeholder }:
  { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // set initial / externally-changed HTML without disturbing the caret while typing
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const cmd = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML || "");
  };

  const Btn = ({ c, arg, label, title }: { c: string; arg?: string; label: string; title: string }) => (
    <button type="button" title={title} className="rt-btn"
      onMouseDown={(e) => { e.preventDefault(); cmd(c, arg); }}>{label}</button>
  );

  return (
    <div className="rt">
      <div className="rt-toolbar">
        <Btn c="bold" label="B" title="Bold" />
        <Btn c="italic" label="I" title="Italic" />
        <Btn c="formatBlock" arg="H3" label="H" title="Heading" />
        <Btn c="insertUnorderedList" label="•" title="Bullet list" />
        <Btn c="insertOrderedList" label="1." title="Numbered list" />
        <Btn c="removeFormat" label="⌫" title="Clear formatting" />
      </div>
      <div ref={ref} className="rt-area" contentEditable suppressContentEditableWarning
        data-placeholder={placeholder || "Write your comments…"}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)} />
    </div>
  );
}
