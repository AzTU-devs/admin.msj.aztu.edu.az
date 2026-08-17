"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ARTICLE_FILE_KINDS,
  ArticleFileDto,
  cms,
  isExternalFile,
  openFile,
} from "@/lib/api";

const KIND_LABEL: Record<string, string> = Object.fromEntries(
  ARTICLE_FILE_KINDS.map((k) => [k.value, k.label])
);

function fmtSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

/**
 * Attach, replace and remove an article's files — the panel the editor screens
 * were missing. Uploading, downloading and deleting all existed on the backend
 * (`/api/v1/admin/articles/{id}/files`); the only place in the admin that could
 * reach them was a one-button cell on the articles *list*, so an editor working
 * inside a submission had no way to put a PDF on it or swap a wrong one out.
 *
 * "Change the PDF" is deliberately the same action as "add a PDF": the backend
 * versions each (article, kind) pair and the public download endpoint serves
 * the highest version, so uploading again supersedes the current file and keeps
 * the previous one as an auditable v(n-1). Deleting is offered separately for
 * genuine mistakes.
 */
export default function PdfManager({
  articleId,
  onChange,
  heading = "Files & PDF",
}: {
  articleId: number;
  /** Called after any successful change, so the parent can refresh its own view. */
  onChange?: () => void;
  heading?: string;
}) {
  const [files, setFiles] = useState<ArticleFileDto[] | null>(null);
  const [kind, setKind] = useState("PUBLISHED_PDF");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    cms
      .articleFiles(articleId)
      .then(setFiles)
      .catch((e) => {
        setFiles([]);
        setErr(e instanceof Error ? e.message : "Could not load files");
      });
  }, [articleId]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(message: string) {
    setOk(message);
    window.setTimeout(() => setOk(""), 4000);
  }

  async function doUpload(file: File) {
    setErr("");
    setOk("");

    const wantsPdf = kind === "PUBLISHED_PDF" || kind === "CAMERA_READY";
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (wantsPdf && !isPdf) {
      setErr(`${KIND_LABEL[kind]} must be a PDF — “${file.name}” is not.`);
      return;
    }
    if (file.size === 0) {
      setErr("That file is empty.");
      return;
    }

    setBusy(true);
    try {
      const saved = await cms.uploadArticleFile(articleId, file, kind);
      flash(
        saved.version > 1
          ? `${KIND_LABEL[kind] ?? kind} replaced — now version ${saved.version}.`
          : `${KIND_LABEL[kind] ?? kind} uploaded.`
      );
      load();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function doSetUrl() {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setErr("Enter a full URL beginning with http:// or https://");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await cms.setArticlePdfUrl(articleId, trimmed);
      setUrl("");
      flash("Published PDF linked from an external URL.");
      load();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not set the URL");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(f: ArticleFileDto) {
    if (!window.confirm(`Remove “${f.originalName}” (${KIND_LABEL[f.kind] ?? f.kind} v${f.version})?`)) return;
    setErr("");
    setBusy(true);
    try {
      await cms.deleteArticleFile(articleId, f.id);
      flash("File removed.");
      load();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  // The file the public site actually serves: newest PUBLISHED_PDF, else newest
  // MANUSCRIPT — the same precedence as ArticleFileController.downloadPdf.
  const live = (() => {
    if (!files?.length) return null;
    const newest = (k: string) =>
      files.filter((f) => f.kind === k).sort((a, b) => b.version - a.version)[0] ?? null;
    return newest("PUBLISHED_PDF") ?? newest("MANUSCRIPT");
  })();

  const sorted = (files ?? []).slice().sort((a, b) => {
    const rank = (k: string) => {
      const i = ARTICLE_FILE_KINDS.findIndex((x) => x.value === k);
      return i < 0 ? 99 : i;
    };
    return rank(a.kind) - rank(b.kind) || b.version - a.version;
  });

  const activeKind = ARTICLE_FILE_KINDS.find((k) => k.value === kind);

  return (
    <div className="panel">
      <div className="panel__h">
        {heading}
        <small>{files == null ? "loading…" : `${files.length} file${files.length === 1 ? "" : "s"}`}</small>
      </div>

      {err && <div className="err">{err}</div>}
      {ok && <div className="ok-msg">{ok}</div>}

      {/* ---- what the public site serves right now ---- */}
      {live ? (
        <div className="pdf-live">
          <span className="pdf-live__tag">Live PDF</span>
          <span className="pdf-live__name">{live.originalName}</span>
          <span className="muted">
            {KIND_LABEL[live.kind] ?? live.kind} · v{live.version}
            {live.sizeBytes ? ` · ${fmtSize(live.sizeBytes)}` : ""}
          </span>
          <a
            className="btn btn--ghost btn--sm"
            href={`/api/v1/articles/${articleId}/pdf`}
            target="_blank"
            rel="noopener"
          >
            Open public link
          </a>
        </div>
      ) : (
        files != null && (
          <div className="pdf-live pdf-live--none">
            <span className="pdf-live__tag pdf-live__tag--warn">No PDF</span>
            <span className="muted">
              The public “Download PDF” button will 404 until a Published PDF is attached.
            </span>
          </div>
        )
      )}

      {/* ---- every attached file ---- */}
      {files != null && files.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          {sorted.map((f) => {
            const external = isExternalFile(f);
            return (
              <div className="file-row" key={f.id}>
                <span style={{ minWidth: 0 }}>
                  <b>{KIND_LABEL[f.kind] ?? f.kind.replace(/_/g, " ")}</b>{" "}
                  <span className="muted">v{f.version}</span>
                  {live?.id === f.id && <span className="pdf-badge">live</span>}
                  {external && <span className="pdf-badge pdf-badge--url">url</span>}
                  <br />
                  {external ? (
                    <a className="linkish" href={f.storageKey} target="_blank" rel="noopener">
                      {f.originalName}
                    </a>
                  ) : (
                    <a
                      className="linkish"
                      style={{ cursor: "pointer" }}
                      onClick={() => openFile(f.id).catch((e) => setErr(e.message))}
                    >
                      {f.originalName}
                    </a>
                  )}
                  <span className="muted">
                    {f.sizeBytes ? ` · ${fmtSize(f.sizeBytes)}` : ""}
                    {f.createdAt ? ` · ${fmtDate(f.createdAt)}` : ""}
                  </span>
                </span>
                <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => doDelete(f)}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- upload / replace ---- */}
      <div className="field" style={{ marginTop: "1.2rem", marginBottom: ".6rem" }}>
        <label>File type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {ARTICLE_FILE_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        {activeKind?.hint && <div className="hint">{activeKind.hint}</div>}
      </div>

      <div
        className={"pdf-drop" + (dragging ? " is-drag" : "") + (busy ? " is-busy" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) doUpload(f);
        }}
        onClick={() => !busy && input.current?.click()}
      >
        <b>{busy ? "Uploading…" : `Drop a file here, or click to choose`}</b>
        <span className="muted">
          Uploading a {KIND_LABEL[kind] ?? kind} again replaces the current one — the previous version is
          kept.
        </span>
        <input
          ref={input}
          type="file"
          hidden
          accept={kind === "PUBLISHED_PDF" || kind === "CAMERA_READY" ? "application/pdf,.pdf" : undefined}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doUpload(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* ---- external URL alternative ---- */}
      <div className="field" style={{ marginTop: "1rem", marginBottom: 0 }}>
        <label>…or link the published PDF from a URL</label>
        <div className="asset">
          <input
            className="asset__url"
            placeholder="https://…/paper.pdf"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doSetUrl();
            }}
          />
          <button className="btn btn--ghost asset__btn" disabled={busy || !url.trim()} onClick={doSetUrl}>
            Link
          </button>
        </div>
        <div className="hint">
          The public download endpoint redirects to the URL instead of serving a stored file.
        </div>
      </div>
    </div>
  );
}
