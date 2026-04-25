// biotechtube/lib/reports/render-mechanism-svg.ts
// V1: simple bubble grid grouped by mechanism keyword. Refine in v1.1.

interface SvgInput {
  companyName: string;
  competitors: { name: string; mechanism?: string | null; pipeline_depth: number }[];
}

export function renderMechanismSvg(input: SvgInput): string {
  const groups: Record<string, { name: string; depth: number }[]> = {};
  for (const c of input.competitors ?? []) {
    const key = (c.mechanism ?? "Other").trim() || "Other";
    (groups[key] ??= []).push({ name: c.name, depth: c.pipeline_depth ?? 0 });
  }
  const groupNames = Object.keys(groups).slice(0, 5);
  const w = 600, h = 320;
  const colW = w / Math.max(groupNames.length, 1);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="Helvetica, Arial, sans-serif" font-size="11">`;
  svg += `<rect width="${w}" height="${h}" fill="#fafafa" stroke="#e5e5e5"/>`;
  svg += `<text x="12" y="20" font-size="12" font-weight="700" fill="#333">Mechanism Cluster — peers</text>`;
  groupNames.forEach((g, i) => {
    const cx = i * colW + colW / 2;
    svg += `<text x="${cx}" y="48" text-anchor="middle" font-weight="600" fill="#444">${escapeXml(g)}</text>`;
    groups[g].slice(0, 6).forEach((p, j) => {
      const r = 10 + Math.min(p.depth * 1.5, 20);
      const cy = 80 + j * 38;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="1.5"/>`;
      svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#1e1e3a">${escapeXml(p.name.slice(0, 18))}</text>`;
    });
  });
  svg += `<text x="12" y="${h - 12}" fill="#9333ea" font-weight="600">&#9733; ${escapeXml(input.companyName)} highlighted in PDF body where applicable</text>`;
  svg += `</svg>`;
  return svg;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, ch => (({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" } as Record<string, string>)[ch]!));
}
