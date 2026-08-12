"use client";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { cms, SiteText, LOCALES } from "@/lib/api";

export default function LabelsAdmin() {
  const [items, setItems] = useState<SiteText[]>([]);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [savedKey, setSavedKey] = useState("");

  const load = () => cms.texts.list().then((list) => {
    setItems(list.sort((a, b) => a.key.localeCompare(b.key)));
    const d: any = {};
    list.forEach((t) => (d[t.key] = { ...t.value }));
    setDraft(d);
  }).catch((e) => setErr(e.message));

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => items.filter((t) => t.key.includes(q) || Object.values(t.value || {}).some((v) => v?.toLowerCase().includes(q.toLowerCase()))),
    [items, q]
  );

  async function save(key: string) {
    setErr(""); setSavedKey("");
    try { await cms.texts.save(key, draft[key] || {}); setSavedKey(key); setTimeout(() => setSavedKey(""), 1500); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
  }

  return (
    <Shell>
      <h1 className="page-h">Site Labels</h1>
      <p className="page-sub">Every UI string on the public site — navigation, hero, section titles, footer. {items.length} keys.</p>
      {err && <div className="err">{err}</div>}
      <div className="panel">
        <input placeholder="Filter labels…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ width: "100%", marginBottom: "1rem", background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 6, padding: ".6rem .8rem", color: "var(--ink)" }} />
        <table className="table">
          <thead><tr><th style={{ width: 180 }}>Key</th>{LOCALES.map((l) => <th key={l}>{l.toUpperCase()}</th>)}<th style={{ width: 90 }}></th></tr></thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.key}>
                <td style={{ fontFamily: "var(--f-mono)", fontSize: ".72rem", color: "var(--accent-ink)" }}>{t.key}</td>
                {LOCALES.map((l) => (
                  <td key={l}>
                    <input value={draft[t.key]?.[l] || ""}
                      onChange={(e) => setDraft({ ...draft, [t.key]: { ...draft[t.key], [l]: e.target.value } })}
                      style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 5, padding: ".4rem .5rem", color: "var(--ink)", fontSize: ".82rem" }} />
                  </td>
                ))}
                <td><button className="btn btn--ghost" onClick={() => save(t.key)}>{savedKey === t.key ? "✓" : "Save"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
