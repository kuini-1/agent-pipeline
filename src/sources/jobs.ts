// Where the research agent's job postings come from. This step is plain
// code, not a model call: fetching is deterministic, and the model only
// sees what was fetched, which is saved with the run.
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { JobPosting, type SearchCriteria } from "../schemas.js";

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** "fixture:<path>" reads postings from a JSON file; "himalayas" queries the Himalayas public job API. */
export async function loadJobs(source: string, criteria: SearchCriteria, signal?: AbortSignal): Promise<JobPosting[]> {
  if (source.startsWith("fixture:")) {
    const raw = JSON.parse(await readFile(source.slice("fixture:".length), "utf8"));
    return z.array(JobPosting).parse(raw);
  }
  if (source === "himalayas") return himalayas(criteria, signal);
  throw new Error(`unknown job source "${source}" (use fixture:<path> or himalayas)`);
}

// --- Himalayas (https://himalayas.app/api) ---------------------------------

const HimalayasJob = z.object({
  guid: z.string(),
  title: z.string(),
  companyName: z.string(),
  applicationLink: z.string().optional().nullable(),
  locationRestrictions: z.array(z.string()).optional().nullable(),
  minSalary: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  salaryPeriod: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const maxJobs = 20;

function stripHtml(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Only USD salaries are converted; anything else is left unknown rather than guessed. */
function monthlyUSD(j: z.infer<typeof HimalayasJob>): number | null {
  if (!j.minSalary || (j.currency ?? "USD") !== "USD") return null;
  const period = (j.salaryPeriod ?? "annual").toLowerCase();
  if (period.startsWith("annual") || period.startsWith("year")) return Math.round(j.minSalary / 12);
  if (period.startsWith("month")) return Math.round(j.minSalary);
  return null;
}

async function himalayas(criteria: SearchCriteria, signal?: AbortSignal): Promise<JobPosting[]> {
  const out = new Map<string, JobPosting>();
  for (const [i, keyword] of criteria.keywords.slice(0, 3).entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1000)); // be polite to a free API
    const url = `https://himalayas.app/jobs/api/search?${new URLSearchParams({ q: keyword, sort: "recent" })}`;
    const res = await fetch(url, { signal, headers: { "user-agent": "agent-pipeline/0.1 (job search demo)" } });
    if (!res.ok) throw new Error(`himalayas: HTTP ${res.status} for "${keyword}"`);
    const body = (await res.json()) as { jobs?: unknown[] };
    for (const item of body.jobs ?? []) {
      const parsed = HimalayasJob.safeParse(item);
      if (!parsed.success) continue;
      const j = parsed.data;
      const id = `hm-${slug(j.guid.split("/").filter(Boolean).slice(-2).join("-"))}`;
      if (out.has(id)) continue;
      out.set(id, {
        id,
        title: j.title,
        company: j.companyName,
        url: j.applicationLink || j.guid,
        location: j.locationRestrictions?.length ? j.locationRestrictions.join(", ") : "Worldwide",
        salary_monthly_usd: monthlyUSD(j),
        description: stripHtml(j.description ?? "").slice(0, 4000),
      });
      if (out.size >= maxJobs) return [...out.values()];
    }
  }
  return [...out.values()];
}
