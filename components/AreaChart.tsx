"use client";
import { SeriesPoint } from "@/lib/api";

/** Dependency-free inline-SVG area chart for the metrics time series. */
export default function AreaChart({ data, height = 200 }: { data: SeriesPoint[]; height?: number }) {
  if (!data.length) return <div className="muted">No data yet.</div>;

  const W = 900, H = height, pad = { t: 10, r: 10, b: 22, l: 34 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => Math.max(d.views, d.downloads)));
  const x = (i: number) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  const line = (key: "views" | "downloads") =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const area = `${line("views")} L${x(data.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;

  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Views and downloads over time">
      {ticks.map((t, i) => {
        const yy = y(t);
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={yy} y2={yy} stroke="rgba(255,255,255,.07)" />
            <text x={4} y={yy + 3} fontSize="9" fill="#7f8ea8" fontFamily="monospace">{t}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d2a748" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d2a748" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#fill)" />
      <path d={line("views")} fill="none" stroke="#d2a748" strokeWidth="2" />
      <path d={line("downloads")} fill="none" stroke="#5aa0e0" strokeWidth="1.6" strokeDasharray="4 3" />
      <g fontSize="10" fontFamily="monospace" fill="#b7c2d6">
        <rect x={pad.l} y={H - 12} width="10" height="3" fill="#d2a748" />
        <text x={pad.l + 14} y={H - 9}>Views</text>
        <rect x={pad.l + 70} y={H - 12} width="10" height="3" fill="#5aa0e0" />
        <text x={pad.l + 84} y={H - 9}>Downloads</text>
      </g>
    </svg>
  );
}
