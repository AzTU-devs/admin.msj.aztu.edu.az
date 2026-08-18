"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { auth, api } from "@/lib/api";

const EDITORIAL = ["ADMIN", "EDITOR", "EDITOR_IN_CHIEF"];
const NAV: { section?: string; requires: string[]; items: { href: string; label: string }[] }[] = [
  { requires: ["AUTHOR"], items: [
    { href: "/submissions", label: "My Submissions" },
    { href: "/submissions/new", label: "New Submission" },
  ] },
  { requires: EDITORIAL, items: [
    { href: "/", label: "Dashboard" },
    { href: "/articles", label: "Submissions" },
    { href: "/reports", label: "Metrics report" },
    { href: "/articles/new", label: "Add article" },
  ] },
  { section: "Review", requires: ["REVIEWER"], items: [
    { href: "/reviews", label: "My Reviews" },
  ] },
  { section: "Content", requires: EDITORIAL, items: [
    { href: "/board", label: "Editorial Board" },
    { href: "/slides", label: "Hero Slides" },
    { href: "/scope", label: "Scope Topics" },
    { href: "/authors", label: "For Authors" },
    { href: "/pages", label: "Content Pages" },
    { href: "/announcements", label: "Announcements" },
    { href: "/issues", label: "Issues" },
  ] },
  { section: "Site", requires: EDITORIAL, items: [
    { href: "/labels", label: "Site Labels" },
    { href: "/settings", label: "Settings" },
  ] },
  { section: "Admin", requires: ["ADMIN"], items: [
    { href: "/users", label: "Users & Roles" },
  ] },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [who, setWho] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (!auth.access) {
      router.replace("/login");
      return;
    }
    api.me()
      .then((u) => { setWho(`${u.firstName} ${u.lastName}`); setRoles(u.roles || []); setReady(true); })
      .catch(() => { auth.clear(); router.replace("/login"); });
  }, [router]);

  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark");
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("msj-admin-theme", next); } catch {}
    setTheme(next);
  }

  if (!ready) return <div className="login"><div className="muted">Loading…</div></div>;

  const groups = NAV.filter((g) => g.requires.some((r) => roles.includes(r)));

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <svg className="brand__mark" viewBox="0 0 64 64" fill="none">
            <g stroke="currentColor" strokeWidth="3">
              <circle cx="32" cy="32" r="13" /><circle cx="32" cy="32" r="4.5" />
              <path strokeLinecap="round" d="M32 19v-7M32 52v-7M45 32h7M12 32h7M41 23l5-5M18 46l5-5M41 41l5 5M18 18l5 5" />
            </g>
          </svg>
          <div>
            <div className="brand__t">Machine Science</div>
            <div className="brand__s">JOURNAL PORTAL</div>
          </div>
        </div>
        <nav className="nav">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.section && <div className="nav__section">{group.section}</div>}
              {group.items.map((n) => (
                <Link key={n.href} href={n.href} className={pathname === n.href ? "active" : ""}>
                  {n.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="side__foot">
          <div>{who}</div>
          <button onClick={toggleTheme}>{theme === "light" ? "◐ Dark mode" : "◑ Light mode"}</button>
          <button onClick={async () => { try { await api.logout(); } catch {} auth.clear(); router.replace("/login"); }}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
