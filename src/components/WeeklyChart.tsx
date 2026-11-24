import type { WeekPoint } from "@/lib/kpis";

const COLORS = { dj: "var(--gold)", store: "var(--red)", none: "#5a564a" } as const;
const LABELS = { dj: "DJ", store: "Magasins de vinyles", none: "Sans profil" } as const;

const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/** Inscriptions par semaine, empilées par type de compte (SVG, sans bibliothèque). */
export default function WeeklyChart({ data }: { data: WeekPoint[] }) {
  const W = 720;
  const H = 220;
  const padL = 30;
  const padB = 26;
  const max = Math.max(1, ...data.map((d) => d.dj + d.store + d.none));
  const top = Math.max(4, Math.ceil(max / 4) * 4);
  const bw = (W - padL) / data.length;
  const y = (v: number) => H - padB - (v / top) * (H - padB - 8);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Inscriptions par semaine et par type de compte">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W} y1={y(top * f)} y2={y(top * f)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 6} y={y(top * f) + 4} textAnchor="end" fontSize="10" fill="var(--paper-dim)">
              {Math.round(top * f)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          let acc = 0;
          const x = padL + i * bw + bw * 0.15;
          return (
            <g key={d.week}>
              {(["dj", "store", "none"] as const).map((k) => {
                const v = d[k];
                if (!v) return null;
                const y0 = y(acc);
                acc += v;
                const y1 = y(acc);
                return <rect key={k} x={x} y={y1} width={bw * 0.7} height={y0 - y1} fill={COLORS[k]} rx="1"><title>{`${LABELS[k]} : ${v}`}</title></rect>;
              })}
              {(i % 2 === 0 || data.length < 8) && (
                <text x={x + bw * 0.35} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--paper-dim)">
                  {fmt.format(new Date(d.week + "T00:00:00Z"))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="chart-legend">
        {(["dj", "store", "none"] as const).map((k) => (
          <span key={k}>
            <i style={{ background: COLORS[k] }} /> {LABELS[k]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
