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

async function tryRefresh(): Promise<boolean> {
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
  me: () => request<LoginResult["user"]>("/api/v1/auth/me"),
  logout: () => request<void>("/api/v1/auth/logout", { method: "POST" }),
  dashboard: () => request<Dashboard>("/api/v1/admin/dashboard"),
  metrics: (days = 30) => request<MetricsOverview>(`/api/v1/admin/metrics/overview?days=${days}`),
  articles: (status?: string, page = 0, size = 20) =>
    request<PageResp<ArticleRow>>(`/api/v1/admin/articles?page=${page}&size=${size}${status ? `&status=${status}` : ""}`),
  updateStatus: (id: number, status: string, comment?: string) =>
    request<void>(`/api/v1/admin/articles/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, comment }) }),
};

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
export interface Issue { id?: number; volume?: number; number?: number; year: number; title: string; description?: string; coverUrl?: string; fullPdfUrl?: string; doi?: string; slug: string; status: string; publishedAt?: string; sortOrder: number; }
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
  texts: {
    list: () => request<SiteText[]>("/api/v1/admin/texts"),
    save: (key: string, value: I18n) =>
      request<SiteText>(`/api/v1/admin/texts/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(value) }),
  },
  settings: {
    get: () => request<JournalSettings>("/api/v1/admin/settings"),
    save: (s: JournalSettings) => request<JournalSettings>("/api/v1/admin/settings", { method: "PUT", body: JSON.stringify(s) }),
  },
  uploadArticleFile: async (articleId: number, file: File, kind = "PUBLISHED_PDF") => {
    const fd = new FormData();
    fd.append("file", file);
    const headers: Record<string, string> = {};
    if (auth.access) headers.Authorization = `Bearer ${auth.access}`;
    const res = await fetch(`${BASE}/api/v1/admin/articles/${articleId}/files?kind=${kind}`, { method: "POST", headers, body: fd });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return res.json();
  },
  setArticlePdfUrl: (articleId: number, url: string) =>
    request(`/api/v1/admin/articles/${articleId}/pdf-url`, { method: "POST", body: JSON.stringify({ url }) }),
  // Generic asset upload -> returns a public /files URL to store in any field.
  uploadAsset: async (file: File, folder = "misc"): Promise<{ url: string; name: string; size: number; contentType: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const headers: Record<string, string> = {};
    if (auth.access) headers.Authorization = `Bearer ${auth.access}`;
    const res = await fetch(`${BASE}/api/v1/admin/uploads?folder=${encodeURIComponent(folder)}`, { method: "POST", headers, body: fd });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return res.json();
  },
};

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
