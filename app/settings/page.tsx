"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { I18nField, AssetField } from "@/components/Cms";
import { cms, JournalSettings } from "@/lib/api";

export default function SettingsAdmin() {
  const [s, setS] = useState<JournalSettings | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  // raw JSON editors for the structured fields
  const [rawIndexed, setRawIndexed] = useState("");
  const [rawSocial, setRawSocial] = useState("");
  const [rawRecord, setRawRecord] = useState("");
  const [rawTicker, setRawTicker] = useState("");

  useEffect(() => {
    cms.settings.get().then((v) => {
      setS(v);
      setRawIndexed(JSON.stringify(v.indexedIn ?? [], null, 2));
      setRawSocial(JSON.stringify(v.social ?? {}, null, 2));
      setRawRecord(JSON.stringify(v.record ?? {}, null, 2));
      setRawTicker(JSON.stringify(v.ticker ?? {}, null, 2));
    }).catch((e) => setErr(e.message));
  }, []);

  if (!s) return <Shell><div className="muted">Loading…</div></Shell>;

  const set = (k: keyof JournalSettings, v: any) => setS({ ...s, [k]: v });

  async function save() {
    setBusy(true); setErr(""); setOk(false);
    try {
      const payload: JournalSettings = {
        ...s!,
        indexedIn: JSON.parse(rawIndexed || "[]"),
        social: JSON.parse(rawSocial || "{}"),
        record: JSON.parse(rawRecord || "{}"),
        ticker: JSON.parse(rawTicker || "{}"),
      };
      const saved = await cms.settings.save(payload);
      setS(saved); setOk(true); setTimeout(() => setOk(false), 1800);
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed (check JSON fields)"); }
    finally { setBusy(false); }
  }

  const scalar = (k: keyof JournalSettings, label: string) => (
    <div className="field"><label>{label}</label>
      <input value={(s as any)[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></div>
  );

  return (
    <Shell>
      <div className="cms-head">
        <div><h1 className="page-h">Journal Settings</h1><p className="page-sub">Identity, contacts, indexing, journal record & ticker</p></div>
        <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : ok ? "✓ Saved" : "Save"}</button>
      </div>
      {err && <div className="err">{err}</div>}

      <div className="panel">
        <div className="panel__h">Identity</div>
        <I18nField label="Journal title" value={s.journalTitle} onChange={(v) => set("journalTitle", v)} />
        <I18nField label="Tagline" value={s.tagline} onChange={(v) => set("tagline", v)} />
        <I18nField label="About (short)" value={s.about} onChange={(v) => set("about", v)} textarea />
      </div>

      <div className="panel">
        <div className="panel__h">Identifiers & contact</div>
        {scalar("issnPrint", "Print ISSN")}
        {scalar("issnOnline", "E-ISSN")}
        {scalar("doiPrefix", "DOI prefix")}
        {scalar("publisher", "Publisher")}
        {scalar("email", "E-mail")}
        {scalar("phone", "Phone")}
        {scalar("publicationFee", "Publication fee")}
        <AssetField label="Logo (URL or upload)" value={s.logoUrl} accept="image/*" folder="logo" onChange={(v) => set("logoUrl", v)} />
        <I18nField label="Address" value={s.address} onChange={(v) => set("address", v)} textarea />
      </div>

      <div className="panel">
        <div className="panel__h">Structured (JSON)</div>
        {[["Indexed in (array)", rawIndexed, setRawIndexed],
          ["Social links (object)", rawSocial, setRawSocial],
          ["Journal record (i18n rows)", rawRecord, setRawRecord],
          ["Ticker (i18n rows)", rawTicker, setRawTicker]].map(([label, val, setter]: any) => (
          <div className="field" key={label}>
            <label>{label}</label>
            <textarea rows={6} value={val} onChange={(e) => setter(e.target.value)}
              style={{ fontFamily: "var(--f-mono)", fontSize: ".78rem" }} />
          </div>
        ))}
      </div>
    </Shell>
  );
}
