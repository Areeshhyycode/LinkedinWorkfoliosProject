/**
 * LinkedIn X-ray search — LinkedIn pe LOGIN kiye bina public profiles dhoondta
 * hai (login karke scrape karna account ban karwata hai).
 *
 * DuckDuckGo se: site:linkedin.com/in (upwork OR fiverr OR freelancer) <skill>
 */
import * as cheerio from "cheerio";

export async function findProfiles(skill, max = 10) {
  const q = `site:linkedin.com/in (upwork OR fiverr OR freelancer) ${skill}`;
  const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const seen = new Set();
  const out = [];
  $("a.result__a").each((_, el) => {
    let href = $(el).attr("href") || "";
    const m = href.match(/uddg=([^&]+)/); // DDG redirect decode
    if (m) href = decodeURIComponent(m[1]);
    if (!/linkedin\.com\/in\//i.test(href)) return;

    const clean = href.split("?")[0].replace(/\/$/, "");
    if (seen.has(clean)) return;
    seen.add(clean);

    const raw = $(el).text().replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
    const [name, ...rest] = raw.split(/\s+[-–—]\s+/);
    out.push({
      name: (name || "").trim() || "there",
      headline: rest.join(" - ").trim(),
      url: clean,
    });
  });

  return out.slice(0, max);
}
