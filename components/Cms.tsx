"use client";
import { useEffect, useState } from "react";
import { LOCALES, cms } from "@/lib/api";

export type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "url" | "select" | "i18n" | "i18n-textarea" | "image" | "file" | "date";
  options?: string[];
  colInTable?: boolean;
};

/** A field that accepts a pasted URL OR an uploaded file (image / PDF). */
export function AssetField({ label, value, onChange, accept, folder }:
  { label: string; value: string | undefined; onChange: (v: string) => void; accept: string; folder: string }) {
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const isImage = accept.includes("image");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setErr(""); setPct(0);
    try { const r = await cms.uploadAsset(f, folder, (p) => setPct(p)); onChange(r.url); }
    catch (er) { setErr(er instanceof Error ? er.message : "Upload failed"); }
    finally { setBusy(false); setPct(0); e.target.value = ""; }
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="asset">
        <input className="asset__url" placeholder="Paste a URL, or upload →" value={value || ""} onChange={(e) => onChange(e.target.value)} />
        <label className={"btn btn--ghost asset__btn" + (busy ? " is-busy" : "")}>
          {busy ? `Uploading… ${pct}%` : "Upload"}
          <input type="file" accept={accept} hidden disabled={busy} onChange={onFile} />
        </label>
      </div>
      {busy && (
        <span className="pdf-bar" style={{ marginTop: ".5rem" }} aria-label={`Upload ${pct}% complete`}>
          <span className="pdf-bar__fill" style={{ width: `${pct}%` }} />
        </span>
      )}
      {err && <div className="err">{err}</div>}
      {value && isImage && <img className="asset__preview" src={value} alt="" />}
      {value && !isImage && <a className="asset__link" href={value} target="_blank" rel="noopener">{value}</a>}
    </div>
  );
}

export function I18nField({ label, value, onChange, textarea }:
  { label: string; value: Record<string, string> | undefined; onChange: (v: Record<string, string>) => void; textarea?: boolean }) {
  const v = value || {};
  return (
    <div className="field">
      <label>{label}</label>
      <div className="i18n-row">
        {LOCALES.map((l) =>
          textarea ? (
            <textarea key={l} placeholder={l.toUpperCase()} value={v[l] || ""}
              onChange={(e) => onChange({ ...v, [l]: e.target.value })} rows={3} />
          ) : (
            <input key={l} placeholder={l.toUpperCase()} value={v[l] || ""}
              onChange={(e) => onChange({ ...v, [l]: e.target.value })} />
          )
        )}
      </div>
    </div>
  );
}

type Api<T> = {
  list: () => Promise<T[]>;
  create: (b: Partial<T>) => Promise<T>;
  update: (id: number, b: Partial<T>) => Promise<T>;
  remove: (id: number) => Promise<void>;
};

export function CollectionEditor<T extends { id?: number }>({
  title, subtitle, fields, api, blank, rowTitle, extra,
}: {
  title: string; subtitle?: string; fields: Field[]; api: Api<T>;
  blank: () => Partial<T>; rowTitle: (item: T) => string; extra?: React.ReactNode;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.list().then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const tableFields = fields.filter((f) => f.colInTable);

  async function save() {
    if (!editing) return;
    setBusy(true); setErr("");
    try {
      const e = editing as any;
      if (e.id) await api.update(e.id, editing);
      else await api.create(editing);
      setEditing(null);
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  }

  async function del(id: number) {
    if (!confirm("Delete this item?")) return;
    setErr("");
    try { await api.remove(id); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Delete failed"); }
  }

  const show = (item: any, f: Field) => {
    const val = item[f.key];
    if (f.type === "boolean") return val ? "Yes" : "No";
    if (f.type === "i18n" || f.type === "i18n-textarea") return (val && (val.en || Object.values(val)[0])) || "—";
    return val ?? "—";
  };

  return (
    <div>
      <div className="cms-head">
        <div>
          <h1 className="page-h">{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
        <div style={{ display: "flex", gap: ".6rem" }}>
          {extra}
          <button className="btn" onClick={() => setEditing(blank())}>+ Add</button>
        </div>
      </div>
      {err && <div className="err">{err}</div>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              {tableFields.map((f) => <th key={f.key}>{f.label}</th>)}
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={(item as any).id}>
                {tableFields.map((f) => <td key={f.key} className={f.type.startsWith("i18n") ? "t-title" : ""}>{show(item, f)}</td>)}
                <td>
                  <button className="btn btn--ghost" onClick={() => setEditing({ ...item })}>Edit</button>{" "}
                  <button className="link-danger" onClick={() => del((item as any).id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={tableFields.length + 1} className="muted">No items yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="drawer" onClick={() => setEditing(null)}>
          <div className="drawer__panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="drawer__h">{(editing as any).id ? "Edit" : "New"} — {title}</h2>
            {err && <div className="err">{err}</div>}
            {fields.map((f) => {
              const e = editing as any;
              if (f.type === "i18n" || f.type === "i18n-textarea")
                return <I18nField key={f.key} label={f.label} value={e[f.key]}
                  onChange={(v) => setEditing({ ...editing, [f.key]: v } as any)} textarea={f.type === "i18n-textarea"} />;
              if (f.type === "image" || f.type === "file")
                return <AssetField key={f.key} label={f.label} value={e[f.key]}
                  accept={f.type === "image" ? "image/*" : "application/pdf,.pdf"} folder={f.key}
                  onChange={(v) => setEditing({ ...editing, [f.key]: v } as any)} />;
              return (
                <div className="field" key={f.key}>
                  <label>{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea rows={4} value={e[f.key] || ""} onChange={(ev) => setEditing({ ...editing, [f.key]: ev.target.value } as any)} />
                  ) : f.type === "boolean" ? (
                    <label className="chk"><input type="checkbox" checked={!!e[f.key]} onChange={(ev) => setEditing({ ...editing, [f.key]: ev.target.checked } as any)} /> {f.label}</label>
                  ) : f.type === "select" ? (
                    <select value={e[f.key] || ""} onChange={(ev) => setEditing({ ...editing, [f.key]: ev.target.value } as any)}>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={e[f.key] ?? ""}
                      onChange={(ev) => setEditing({ ...editing, [f.key]: f.type === "number" ? Number(ev.target.value) : ev.target.value } as any)} />
                  )}
                </div>
              );
            })}
            <div className="drawer__foot">
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
