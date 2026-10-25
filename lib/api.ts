// Admin API client. Access token kept in localStorage; refresh token too.
// (For production, prefer httpOnly cookies — noted in the README.)

// Empty by default → browser calls are same-origin (/api/...) and the Next
// server proxies them to the backend. Set NEXT_PUBLIC_API_URL to call directly.
const BASE = process.env.NEXT_PUBLIC_API_URL || "";

const ACCESS = "msj_admin_access";
const REFRESH = "msj_admin_refresh";

export const auth = {
  get access() { return typeof window === "undefined" ? null : localStorage.getItem(ACCESS); },
  get refresh() { return typeof window === "undefined" ? null : localStorage.getItem(REFRESH); },
  set(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS, accessToken);
    localStorage.setItem(REFRESH, refreshToken);
  },
  clear() { localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); },
};

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (auth.access) headers.set("Authorization", `Bearer ${auth.access}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && retry && auth.refresh) {
    const ok = await tryRefresh();
    if (ok) return request<T>(path, init, false);
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const b = await res.json(); msg = b.message || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// One refresh at a time. A page that fires several requests as its access token
// expires would otherwise send the same refresh token several times — and the
// server treats a rotated-out token coming back as a stolen one being replayed.
let refreshing: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refresh }),
    });
    if (!res.ok) { auth.clear(); return false; }
    const data = await res.json();
    auth.set(data.accessToken, data.refreshToken);
    return true;
  } catch { auth.clear(); return false; }
}

// ---- types ----
export interface Dashboard {
  totalArticles: number; publishedArticles: number; totalUsers: number;
  totalViews: number; totalDownloads: number; totalCitations: number;
  articlesByStatus: Record<string, number>;
}
export interface SeriesPoint { day: string; views: number; downloads: number; }
export interface TopArticle { id: number; title: string; views: number; downloads: number; citations: number; }
export interface MetricsOverview {
  totalViews: number; totalDownloads: number; totalCitations: number;
  series: SeriesPoint[]; topArticles: TopArticle[];
}
export interface ArticleRow {
  id: number; title: string; status: string; subjectArea: string | null;
  doi: string | null; submitterId: number; submittedAt: string | null; createdAt: string;
  views: number; downloads: number; citations: number;
}
export interface PageResp<T> {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean;
}
export interface LoginResult {
  accessToken: string; refreshToken: string;
  user: { id: number; email: string; firstName: string; lastName: string; roles: string[] };
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResult>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data: {
    email: string; password: string; firstName: string; lastName: string;
    title: string; phone: string; degree: string; position: string;
    affiliation: string; country: string; orcid: string;
    city?: string; postalCode?: string;
  }) => request<LoginResult>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => request<LoginResult["user"]>("/api/v1/auth/me"),
  logout: () => request<void>("/api/v1/auth/logout", { method: "POST" }),
  dashboard: () => request<Dashboard>("/api/v1/admin/dashboard"),
  metrics: (days = 30) => request<MetricsOverview>(`/api/v1/admin/metrics/overview?days=${days}`),
  articles: (status?: string, page = 0, size = 20) =>
    request<PageResp<ArticleRow>>(`/api/v1/admin/articles?page=${page}&size=${size}${status ? `&status=${status}` : ""}`),
  updateStatus: (id: number, status: string, comment?: string) =>
    request<void>(`/api/v1/admin/articles/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, comment }) }),
  createArticle: (input: NewArticleInput) =>
    request<{ id: number }>("/api/v1/admin/articles", { method: "POST", body: JSON.stringify(input) }),
  updateArticle: (id: number, input: NewArticleInput) =>
    request<void>(`/api/v1/admin/articles/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteArticle: (id: number) =>
    request<void>(`/api/v1/admin/articles/${id}`, { method: "DELETE" }),
  refreshCitations: () =>
    request<{ articles: number; updated: number; failed: number; totalCitations: number }>(
      "/api/v1/admin/citations/refresh", { method: "POST" }),
  syncCitations: () =>
    request<{
      dois: { publishedArticles: number; matched: number; alreadyHadDoi: number; unmatched: number };
      citations: { articles: number; updated: number; failed: number; totalCitations: number };
    }>("/api/v1/admin/citations/sync", { method: "POST" }),
};

// ==================== METRICS REPORT ====================
export interface ReportArticleRow {
  id: number; title: string; doi: string | null; subjectArea: string | null;
  issueTitle: string | null; issueYear: number | null; issueNumber: number | null;
  pageStart: number | null; pageEnd: number | null;
  views: number; downloads: number; citations: number;
}
export interface ReportIssueRow {
  id: number; title: string; year: number | null; number: number | null; volume: number | null;
  status: string; articles: number; views: number; downloads: number; citations: number;
}
export interface ReportCountryRow { code: string; views: number; }
export interface MetricsExport {
  generatedAt: string;
  totals: { articles: number; publishedArticles: number; issues: number;
            views: number; downloads: number; citations: number };
  articles: ReportArticleRow[];
  issues: ReportIssueRow[];
  countries: ReportCountryRow[];
}

export const reports = {
  metrics: () => request<MetricsExport>("/api/v1/admin/reports/metrics"),
};

/** ISO-3166-1 alpha-2 -> English name, for the reader-country table. "??" is
 *  the bucket for events recorded before country capture existed. */
export const COUNTRY_NAMES: Record<string, string> = {
  "??": "Unknown", AZ: "Azerbaijan", TR: "Türkiye", RU: "Russia", US: "United States",
  DE: "Germany", GB: "United Kingdom", CN: "China", IN: "India", IR: "Iran", UA: "Ukraine",
  PL: "Poland", FR: "France", IT: "Italy", ES: "Spain", NL: "Netherlands", JP: "Japan",
  KR: "South Korea", BR: "Brazil", CA: "Canada", AU: "Australia", KZ: "Kazakhstan",
  UZ: "Uzbekistan", GE: "Georgia", BY: "Belarus", RO: "Romania", CZ: "Czechia",
  VN: "Vietnam", ID: "Indonesia", PK: "Pakistan", EG: "Egypt", SA: "Saudi Arabia",
  AE: "United Arab Emirates", IQ: "Iraq", MY: "Malaysia", TH: "Thailand", NG: "Nigeria",
  ZA: "South Africa", MX: "Mexico", AR: "Argentina", SE: "Sweden", CH: "Switzerland",
  AT: "Austria", BE: "Belgium", PT: "Portugal", GR: "Greece", NO: "Norway", FI: "Finland",
  DK: "Denmark", IE: "Ireland", IL: "Israel", SG: "Singapore", TW: "Taiwan", BD: "Bangladesh",
};

/** "AZ" -> the regional-indicator flag emoji. Purely presentational. */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const ARTICLE_STATUSES = [
  "SUBMITTED", "WITH_EDITOR", "UNDER_REVIEW", "REVISION_REQUESTED", "RESUBMITTED",
  "ACCEPTED", "REJECTED", "COPYEDITING", "IN_PRODUCTION", "PUBLISHED", "WITHDRAWN",
];

// ==================== CMS ====================
export type I18n = Record<string, string>;

export interface BoardMember {
  id?: number; fullName: string; title?: string; section: string;
  photoUrl?: string; orcidUrl?: string; scopusUrl?: string; email?: string;
  country?: string; sortOrder: number; active: boolean;
}
export interface HeroSlide { id?: number; imageUrl: string; caption: I18n; altText?: string; sortOrder: number; active: boolean; }
export interface ScopeTopic { id?: number; icon: string; title: I18n; description: I18n; sortOrder: number; active: boolean; }
export interface AuthorStep { id?: number; stepNo?: string; title: I18n; body: I18n; sortOrder: number; }
export interface AuthorTerm { id?: number; title: I18n; body: I18n; sortOrder: number; }
export interface Announcement { id?: number; title: I18n; body: I18n; imageUrl?: string; linkUrl?: string; pinned: boolean; status: string; publishedAt: string; sortOrder: number; }
export interface ContentPage { id?: number; slug: string; title: I18n; body: I18n; status: string; sortOrder: number; }
export interface Issue { id?: number; volume?: number; number?: number; year: number; title: string; description?: string; coverUrl?: string; fullPdfUrl?: string; doi?: string; slug: string; status: string; publishedAt?: string; submissionDeadline?: string; sortOrder: number; }
export interface SiteText { key: string; value: I18n; }
export interface JournalSettings {
  journalTitle: I18n; tagline: I18n; about: I18n; issnPrint?: string; issnOnline?: string;
  doiPrefix?: string; publisher?: string; email?: string; phone?: string; address: I18n;
  indexedIn: string[]; social: I18n; publicationFee?: string; logoUrl?: string;
  record: Record<string, string[][]>; ticker: Record<string, string[][]>;
}

function crud<T>(base: string) {
  return {
    list: () => request<T[]>(base),
    create: (b: Partial<T>) => request<T>(base, { method: "POST", body: JSON.stringify(b) }),
    update: (id: number, b: Partial<T>) => request<T>(`${base}/${id}`, { method: "PUT", body: JSON.stringify(b) }),
    remove: (id: number) => request<void>(`${base}/${id}`, { method: "DELETE" }),
  };
}

export const cms = {
  board: crud<BoardMember>("/api/v1/admin/board"),
  slides: crud<HeroSlide>("/api/v1/admin/hero-slides"),
  scope: crud<ScopeTopic>("/api/v1/admin/scope-topics"),
  steps: crud<AuthorStep>("/api/v1/admin/author-steps"),
  terms: crud<AuthorTerm>("/api/v1/admin/author-terms"),
  announcements: crud<Announcement>("/api/v1/admin/announcements"),
  pages: crud<ContentPage>("/api/v1/admin/pages"),
  issues: crud<Issue>("/api/v1/admin/issues"),
  openYear: (year: number) => request<Issue[]>(`/api/v1/admin/years/${year}`, { method: "POST" }),
  texts: {
    list: () => request<SiteText[]>("/api/v1/admin/texts"),
    save: (key: string, value: I18n) =>
      request<SiteText>(`/api/v1/admin/texts/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(value) }),
  },
  settings: {
    get: () => request<JournalSettings>("/api/v1/admin/settings"),
    save: (s: JournalSettings) => request<JournalSettings>("/api/v1/admin/settings", { method: "PUT", body: JSON.stringify(s) }),
  },
  // ---- article files -----------------------------------------------------
  // The backend versions each (article, kind) pair automatically: uploading a
  // second PUBLISHED_PDF creates v2 and the public /articles/{id}/pdf endpoint
  // serves the highest version. So "change the PDF" is just another upload —
  // there is no replace endpoint and none is needed.
  articleFiles: (articleId: number) =>
    request<ArticleFileDto[]>(`/api/v1/admin/articles/${articleId}/files`),
  uploadArticleFile: (articleId: number, file: File, kind = "PUBLISHED_PDF", onProgress?: ProgressFn) =>
    uploadWithProgress<ArticleFileDto>(
      `/api/v1/admin/articles/${articleId}/files?kind=${encodeURIComponent(kind)}`,
      file,
      onProgress
    ),
  deleteArticleFile: (articleId: number, fileId: number) =>
    request<void>(`/api/v1/admin/articles/${articleId}/files/${fileId}`, { method: "DELETE" }),
  setArticlePdfUrl: (articleId: number, url: string) =>
    request<ArticleFileDto>(`/api/v1/admin/articles/${articleId}/pdf-url`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  // Generic asset upload -> returns a public /files URL to store in any field.
  // Used for covers, logos, board portraits and full-issue PDFs, so it carries
  // the same progress reporting and size guard as the article uploader.
  uploadAsset: (file: File, folder = "misc", onProgress?: ProgressFn) =>
    uploadWithProgress<{ url: string; name: string; size: number; contentType: string }>(
      `/api/v1/admin/uploads?folder=${encodeURIComponent(folder)}`,
      file,
      onProgress
    ),
};

/** A file attached to an article (ArticleFile entity as the admin API returns it). */
export interface ArticleFileDto {
  id: number;
  articleId: number;
  kind: string;
  originalName: string;
  storageKey: string;
  contentType: string | null;
  sizeBytes: number | null;
  version: number;
  uploadedBy: number | null;
  createdAt: string | null;
}

/** The kinds the backend recognises, in the order an editor works through them. */
export const ARTICLE_FILE_KINDS: { value: string; label: string; hint?: string }[] = [
  { value: "PUBLISHED_PDF", label: "Published PDF", hint: "Served by the public Download PDF button" },
  { value: "CAMERA_READY", label: "Camera-ready" },
  { value: "MANUSCRIPT", label: "Manuscript" },
  { value: "REVISION", label: "Revision" },
  { value: "SUPPLEMENTARY", label: "Supplementary" },
  { value: "COVER_LETTER", label: "Cover letter" },
];

/** A stored file's key is a path; an externally linked one is a URL. */
export function isExternalFile(f: ArticleFileDto): boolean {
  return /^https?:\/\//.test(f.storageKey || "");
}

/** The server's ceiling, mirrored client-side so a doomed upload fails instantly. */
export const MAX_UPLOAD_BYTES = 400 * 1024 * 1024;

export type ProgressFn = (percent: number, loaded: number, total: number) => void;

/**
 * Multipart upload with real progress.
 *
 * `fetch` cannot report *upload* progress — its streaming half is
 * request-body-agnostic in every shipping browser — so a 400MB manuscript
 * would sit on a dead spinner for minutes with no sign it was working.
 * XMLHttpRequest still exposes `upload.onprogress`, which is the only reason
 * it is used here rather than the `request()` helper above.
 */
function uploadWithProgress<T>(path: string, file: File, onProgress?: ProgressFn): Promise<T> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(
      new Error(
        `That file is ${(file.size / 1024 / 1024).toFixed(0)} MB — the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
      )
    );
  }

  return new Promise<T>((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);
    if (auth.access) xhr.setRequestHeader("Authorization", `Bearer ${auth.access}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100), e.loaded, e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? (JSON.parse(xhr.responseText) as T) : (undefined as T));
        } catch {
          reject(new Error("The server returned a malformed response."));
        }
        return;
      }
      reject(new Error(uploadErrorMessage(xhr.status, xhr.responseText)));
    };
    // A body rejected mid-stream (nginx client_max_body_size) surfaces as a
    // reset connection, not as a status — say so rather than "unknown error".
    xhr.onerror = () =>
      reject(new Error("The connection dropped during upload — the file may exceed the server's limit."));
    xhr.ontimeout = () => reject(new Error("The upload timed out."));
    xhr.send(fd);
  });
}

/** Pull a useful message out of a failed multipart upload. */
function uploadErrorMessage(status: number, body: string): string {
  if (status === 413) return "The file is too large for the server's upload limit.";
  if (status === 401 || status === 403) return "Not authorised — sign in again.";
  try {
    const parsed = JSON.parse(body);
    if (parsed?.message) return String(parsed.message);
  } catch {
    /* not JSON */
  }
  return `Upload failed (${status})`;
}

export const LOCALES = ["en", "az", "ru"] as const;

// ==================== REVIEW WORKFLOW ====================
export interface WfAuthor { firstName: string; lastName: string; email: string | null; affiliation: string | null; country: string | null; orcid: string | null; corresponding: boolean; }
export interface WfFile { id: number; kind: string; originalName: string; sizeBytes: number | null; contentType: string | null; }
export interface ReviewerUser { id: number; name: string; email: string | null; affiliation: string | null; }
export interface AssignmentDto { id: number; reviewerId: number; reviewerName: string; status: string; dueDate: string | null; invitedAt: string | null; completedAt: string | null; reviewSubmitted: boolean; }
export interface EditorReview { id: number; reviewerId: number; reviewerName: string; recommendation: string; score: number | null; commentsToAuthor: string | null; commentsToEditor: string | null; submittedAt: string; }
export interface WfStatusEvent { fromStatus: string | null; toStatus: string; changedByName: string | null; comment: string | null; at: string; }
export interface EditorialArticle {
  id: number; title: string; abstractText: string | null; keywords: string | null; subjectArea: string | null;
  language: string; status: string; doi: string | null; issueId: number | null; submittedAt: string | null; createdAt: string;
  // Round-tripped by the edit form. Before these existed the form reloaded them
  // as null and every save wiped the article's pagination and issue position.
  pageStart: number | null; pageEnd: number | null; articleOrder: number | null;
  // The parent issue's, for display only — volume and number belong to the issue.
  issueTitle: string | null; issueVolume: number | null; issueNumber: number | null;
  authors: WfAuthor[]; files: WfFile[]; assignments: AssignmentDto[]; reviews: EditorReview[]; history: WfStatusEvent[];
}

// reviewer side
export interface AssignmentSummary { id: number; articleId: number; articleTitle: string; subjectArea: string | null; assignmentStatus: string; articleStatus: string | null; dueDate: string | null; invitedAt: string | null; reviewSubmitted: boolean; }
export interface ArticleForReview { id: number; title: string; abstractText: string | null; keywords: string | null; subjectArea: string | null; language: string; status: string; submittedAt: string | null; authors: WfAuthor[]; files: WfFile[]; }
export interface MyReview { id: number; recommendation: string; score: number | null; commentsToAuthor: string | null; commentsToEditor: string | null; submittedAt: string; }
export interface AssignmentDetail { assignment: AssignmentSummary; article: ArticleForReview; myReview: MyReview | null; }

export const RECOMMENDATIONS = [
  { value: "ACCEPT", label: "Accept" },
  { value: "MINOR_REVISION", label: "Minor revision" },
  { value: "MAJOR_REVISION", label: "Major revision" },
  { value: "REJECT", label: "Reject" },
];

export const editorial = {
  reviewers: () => request<ReviewerUser[]>("/api/v1/admin/reviewers"),
  article: (id: number) => request<EditorialArticle>(`/api/v1/admin/articles/${id}`),
  assign: (id: number, reviewerIds: number[], dueDate: string | null) =>
    request<void>(`/api/v1/admin/articles/${id}/assign`, { method: "POST", body: JSON.stringify({ reviewerIds, dueDate }) }),
  cancelAssignment: (id: number, assignmentId: number) =>
    request<void>(`/api/v1/admin/articles/${id}/assignments/${assignmentId}`, { method: "DELETE" }),
  decide: (id: number, decision: string, note: string, issueId: number | null) =>
    request<void>(`/api/v1/admin/articles/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, note, issueId }) }),
};

export const reviewer = {
  assignments: () => request<AssignmentSummary[]>("/api/v1/reviewer/assignments"),
  assignment: (id: number) => request<AssignmentDetail>(`/api/v1/reviewer/assignments/${id}`),
  respond: (id: number, accept: boolean) =>
    request<void>(`/api/v1/reviewer/assignments/${id}/respond?accept=${accept}`, { method: "POST" }),
  submitReview: (id: number, input: { recommendation: string; score: number | null; commentsToAuthor: string; commentsToEditor: string }) =>
    request<MyReview>(`/api/v1/reviewer/assignments/${id}/review`, { method: "POST", body: JSON.stringify(input) }),
};

export function fileDownloadUrl(fileId: number) {
  return `${BASE}/api/v1/files/${fileId}/download`;
}

/** Downloads a protected file with the auth header and opens it in a new tab. */
export async function openFile(fileId: number) {
  const res = await fetch(fileDownloadUrl(fileId), {
    headers: auth.access ? { Authorization: `Bearer ${auth.access}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const WF_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", WITH_EDITOR: "With editor-in-chief", UNDER_REVIEW: "Under review",
  REVISION_REQUESTED: "Revision requested", RESUBMITTED: "Resubmitted", ACCEPTED: "Accepted",
  REJECTED: "Rejected", COPYEDITING: "Copyediting", IN_PRODUCTION: "In production", PUBLISHED: "Published", WITHDRAWN: "Withdrawn",
};

// ==================== AUTHOR SELF-SERVICE (submissions) ====================
// The author side of the portal: create/edit a manuscript, upload the PDF, and
// submit it for review. These hit the same author endpoints the public site
// used before author sign-in moved into this portal.
export interface AuthorInput {
  firstName: string; lastName: string; email?: string; affiliation?: string;
  country?: string; orcid?: string; corresponding: boolean;
}
export interface SubmissionInput {
  title: string; abstractText?: string; keywords?: string; subjectArea?: string;
  language?: string; issueId?: number | null; authors: AuthorInput[];
}
export interface OpenSection {
  id: number; year: number; number: number | null; numberRoman: string;
  title: string; submissionDeadline: string | null;
}
export interface SubmissionFileDto {
  id: number; kind: string; originalName: string; sizeBytes: number | null;
  contentType: string | null; createdAt: string;
}
export interface ReviewForAuthor { recommendation: string; commentsToAuthor: string | null; submittedAt: string; }
export interface SubmissionStatusEvent { fromStatus: string | null; toStatus: string; comment: string | null; at: string; }
export interface SubmissionSummary {
  id: number; title: string; status: string; subjectArea: string | null;
  submittedAt: string | null; updatedAt: string;
}
export interface SubmissionDetail extends SubmissionSummary {
  abstractText: string | null; keywords: string | null; language: string; doi: string | null; createdAt: string;
  issueId: number | null; issueTitle: string | null;
  authors: AuthorInput[]; files: SubmissionFileDto[]; history: SubmissionStatusEvent[];
  reviews: ReviewForAuthor[]; editorNote: string | null; canEdit: boolean;
}

export const submissions = {
  listMine: () => request<SubmissionSummary[]>("/api/v1/me/submissions"),
  get: (id: number) => request<SubmissionDetail>(`/api/v1/submissions/${id}`),
  create: (input: SubmissionInput) => request<SubmissionDetail>("/api/v1/submissions", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: SubmissionInput) => request<SubmissionDetail>(`/api/v1/submissions/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  submit: (id: number) => request<SubmissionDetail>(`/api/v1/submissions/${id}/submit`, { method: "POST" }),
  openSections: () => request<OpenSection[]>("/api/v1/issues/open"),
  deleteFile: (id: number, fileId: number) => request<void>(`/api/v1/submissions/${id}/files/${fileId}`, { method: "DELETE" }),
  uploadFile: (id: number, file: File, kind = "MANUSCRIPT", onProgress?: ProgressFn) =>
    uploadWithProgress<SubmissionFileDto>(
      `/api/v1/submissions/${id}/files?kind=${encodeURIComponent(kind)}`,
      file,
      onProgress
    ),
};

export const SUBJECT_AREAS = [
  "Machine design", "Mechanics", "Materials Science and Metallurgy", "Mechanical engineering technology",
  "Automation and ICT", "Energy and Environment", "Economics and management",
];

export const REC_LABELS: Record<string, string> = {
  ACCEPT: "Accept", MINOR_REVISION: "Minor revision", MAJOR_REVISION: "Major revision", REJECT: "Reject",
};

// ==================== ADD ARTICLE (editorial direct publish) ====================
export interface NewArticleAuthor {
  firstName: string; lastName: string; email?: string; affiliation?: string;
  country?: string; orcid?: string; corresponding: boolean;
}
export interface NewArticleInput {
  title: string; abstractText?: string; keywords?: string; subjectArea?: string; language?: string; doi?: string;
  issueId?: number | null; pageStart?: number | null; pageEnd?: number | null; articleOrder?: number | null;
  authors: NewArticleAuthor[];
}

// ==================== USERS & ROLES (super-admin) ====================
export interface AdminUser { id: number; email: string; firstName: string; lastName: string; status: string; roles: string[]; }

/** Everything the directory holds about an account. The password hash is never sent. */
export interface AdminUserDetail extends AdminUser {
  middleName: string | null; title: string | null; degree: string | null; position: string | null;
  affiliation: string | null; country: string | null; city: string | null; postalCode: string | null;
  phone: string | null; orcid: string | null; scopusId: string | null; websiteUrl: string | null;
  avatarUrl: string | null; bio: string | null;
  emailVerified: boolean; emailVerifiedAt: string | null;
  availableReviewer: boolean; preferredLocale: string;
  lastLoginAt: string | null; createdAt: string | null; updatedAt: string | null;
  submissionCount: number; reviewCount: number; reviewAssignmentCount: number;
  /** Seconds left on a lockout after repeated wrong passwords; 0 = not locked. */
  signInLockedForSeconds: number;
  /** False when deleting would break the editorial record — erase (anonymise) instead. */
  deletable: boolean;
  sessions: UserSession[];
}

/** One sign-in: where it came from and whether it is still live. */
export interface UserSession {
  id: number; createdAt: string; expiresAt: string; active: boolean;
  ipAddress: string | null; userAgent: string | null;
}

export const ROLE_OPTIONS = ["ADMIN", "EDITOR_IN_CHIEF", "EDITOR", "REVIEWER", "AUTHOR"];

/** ACTIVE and BLOCKED are the two an admin toggles between; PENDING is pre-verification;
 *  DELETED is an erased account kept only so the editorial record stays intact. */
export const USER_STATUSES = ["ACTIVE", "BLOCKED", "PENDING", "DELETED"] as const;

export const users = {
  list: () => request<AdminUser[]>("/api/v1/admin/users"),
  detail: (id: number) => request<AdminUserDetail>(`/api/v1/admin/users/${id}`),
  setRoles: (id: number, roles: string[]) =>
    request<AdminUser>(`/api/v1/admin/users/${id}/roles`, { method: "PUT", body: JSON.stringify({ roles }) }),
  setStatus: (id: number, status: string) =>
    request<AdminUser>(`/api/v1/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  remove: (id: number) => request<void>(`/api/v1/admin/users/${id}`, { method: "DELETE" }),
  /** Clears every personal field but keeps the row, for accounts with editorial history. */
  anonymize: (id: number) =>
    request<AdminUser>(`/api/v1/admin/users/${id}/anonymize`, { method: "POST" }),
  /** Signs the account out of every device now. */
  revokeSessions: (id: number) =>
    request<void>(`/api/v1/admin/users/${id}/revoke-sessions`, { method: "POST" }),
  /** Lifts a lockout caused by repeated wrong passwords. */
  unlock: (id: number) => request<void>(`/api/v1/admin/users/${id}/unlock`, { method: "POST" }),
};

// ==================== SECURITY CONSOLE (super-admin) ====================
export interface IpBlock {
  id: number; cidr: string; reason: string | null; source: "MANUAL" | "AUTO";
  createdByEmail: string | null; createdAt: string | null; expiresAt: string | null;
  active: boolean; hitCount: number; lastHitAt: string | null;
}
export interface AuditRow {
  id: number; createdAt: string; actorId: number | null; actorEmail: string | null;
  action: string; outcome: "SUCCESS" | "FAILURE" | "DENIED";
  entity: string | null; entityId: string | null; summary: string | null;
  ipAddress: string | null; userAgent: string | null; metadata: Record<string, unknown> | null;
}
export interface SecurityOverview {
  signInsOk24h: number; signInsFailed24h: number; lockouts24h: number; accessDenied24h: number;
  rateLimited24h: number; autoBlocks24h: number; tokenReuse24h: number; activeIpBlocks: number;
  /** The address the API sees this admin connecting from — a block covering it is refused. */
  yourIp: string; actions: string[];
}
export interface AuditFilter {
  action?: string; outcome?: string; q?: string; ip?: string;
  entity?: string; entityId?: string; from?: string; to?: string;
}

function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  return q.toString();
}

/** Fetches a protected file with the auth header and hands it to the browser as a download. */
async function downloadAuthed(path: string, fallbackName: string, retry = true): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    headers: auth.access ? { Authorization: `Bearer ${auth.access}` } : {},
  });
  if (res.status === 401 && retry && auth.refresh && (await tryRefresh())) {
    return downloadAuthed(path, fallbackName, false);
  }
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") || "")?.[1] || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const security = {
  overview: () => request<SecurityOverview>("/api/v1/admin/security/overview"),
  auditLogs: (f: AuditFilter, page = 0, size = 50) =>
    request<PageResp<AuditRow>>(`/api/v1/admin/security/audit-logs?${query({ ...f, page, size })}`),
  exportAuditCsv: (f: AuditFilter) =>
    downloadAuthed(`/api/v1/admin/security/audit-logs/export?${query({ ...f })}`, "msj-audit-log.csv"),
  ipBlocks: () => request<IpBlock[]>("/api/v1/admin/security/ip-blocks"),
  /** minutes: null = permanent. */
  block: (cidr: string, reason: string, minutes: number | null) =>
    request<IpBlock>("/api/v1/admin/security/ip-blocks", {
      method: "POST",
      body: JSON.stringify({ cidr, reason, minutes }),
    }),
  unblock: (id: number) => request<void>(`/api/v1/admin/security/ip-blocks/${id}`, { method: "DELETE" }),
};

/** Durations offered when blocking an address. */
export const BLOCK_DURATIONS: { label: string; minutes: number | null }[] = [
  { label: "1 hour", minutes: 60 },
  { label: "24 hours", minutes: 1440 },
  { label: "7 days", minutes: 10080 },
  { label: "30 days", minutes: 43200 },
  { label: "Permanent", minutes: null },
];

/** Human labels for audit actions; unknown ones fall back to the code itself. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Signed in", LOGIN_FAILURE: "Failed sign-in", LOGIN_LOCKED_OUT: "Sign-in refused (locked)",
  ACCOUNT_LOCKED: "Account locked", LOGIN_REJECTED_INACTIVE: "Sign-in refused (inactive)",
  LOGOUT: "Signed out", REGISTER: "Registered", REFRESH_TOKEN_REUSE: "Stolen token replay",
  ACCESS_DENIED: "Access denied", RATE_LIMITED: "Rate limited",
  USER_ROLES_CHANGED: "Roles changed", USER_BLOCKED: "User blocked", USER_UNBLOCKED: "User unblocked",
  USER_STATUS_CHANGED: "Status changed", USER_SESSIONS_REVOKED: "Signed out everywhere",
  USER_SIGNIN_UNLOCKED: "Lockout cleared", USER_DELETED: "User deleted", USER_ANONYMIZED: "User data erased",
  IP_BLOCKED: "IP blocked", IP_UNBLOCKED: "IP unblocked", IP_AUTO_BLOCKED: "IP auto-blocked",
  AUDIT_EXPORTED: "Audit log exported",
  ARTICLE_STATUS_CHANGED: "Article status changed", EDITORIAL_DECISION: "Editorial decision",
  REVIEWERS_ASSIGNED: "Reviewers assigned", REVIEWER_UNASSIGNED: "Reviewer unassigned",
  ARTICLE_FILE_UPLOADED: "Article file uploaded", ARTICLE_PDF_LINKED: "Article PDF linked",
  ARTICLE_FILE_DELETED: "Article file deleted", ARTICLE_CREATED: "Article created",
  ARTICLE_UPDATED: "Article updated", ARTICLE_DELETED: "Article deleted",
  SETTINGS_UPDATED: "Settings updated", ASSET_UPLOADED: "Asset uploaded", YEAR_OPENED: "Year opened",
  CITATIONS_REFRESHED: "Citations refreshed", CONTENT_CREATED: "Content created",
  CONTENT_UPDATED: "Content updated", CONTENT_DELETED: "Content deleted",
  SUBMISSION_CREATED: "Submission created", SUBMISSION_UPDATED: "Submission updated",
  SUBMISSION_FILE_UPLOADED: "Submission file uploaded", SUBMISSION_FILE_DELETED: "Submission file deleted",
  SUBMISSION_SUBMITTED: "Submission sent", REVIEW_INVITATION_ANSWERED: "Review invitation answered",
  REVIEW_SUBMITTED: "Review submitted", FILE_DOWNLOADED: "Protected file downloaded",
};
