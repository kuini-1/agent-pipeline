import { ResearchOutput, type CandidateProfile, type JobPosting, type SearchCriteria } from "../schemas.js";
import { json, type Agent } from "./agent.js";

export interface ResearchInput {
  profile: CandidateProfile;
  criteria: SearchCriteria;
  jobs: JobPosting[];
}

const descriptionLimit = 2000;

export const researchAgent: Agent<ResearchInput, ResearchOutput> = {
  name: "research",
  schema: ResearchOutput,
  maxTokens: 16000,
  system: `You screen remote job postings for one candidate and decide which are worth applying to.

Hard rules, applied before judging fit:
- Reject a job whose listed monthly salary is below the candidate's floor.
- Reject a job that is not open to someone working from the candidate's country or region.
- A job with no salary listed can be selected; note "salary not listed" as a concern.

For the jobs that pass, judge fit between the candidate's actual experience and what the posting asks for. match_score is 0-100. Select at most the number of jobs the criteria allow, best match first. Every job id in the input must appear exactly once, in selected or in rejected, and every rejection needs a short, specific reason. key_requirements are the 3-5 things the posting cares about most, in your words. concerns are gaps or risks the cover letter writer should know about.`,

  prompt({ profile, criteria, jobs }) {
    const postings = jobs.map((j) => ({ ...j, description: j.description.slice(0, descriptionLimit) }));
    return `<candidate>\n${json(profile)}\n</candidate>\n\n<criteria>\n${json(criteria)}\n</criteria>\n\n<jobs count="${jobs.length}">\n${json(postings)}\n</jobs>`;
  },

  check({ criteria, jobs }) {
    return (out) => {
      const errors: string[] = [];
      const byId = new Map(jobs.map((j) => [j.id, j]));
      const seen = new Map<string, number>();
      for (const id of [...out.selected.map((s) => s.job_id), ...out.rejected.map((r) => r.job_id)]) {
        seen.set(id, (seen.get(id) ?? 0) + 1);
      }
      for (const [id, n] of seen) {
        if (!byId.has(id)) errors.push(`job_id "${id}" is not one of the input jobs`);
        else if (n > 1) errors.push(`job_id "${id}" appears ${n} times; each job goes in selected or rejected once`);
      }
      for (const id of byId.keys()) {
        if (!seen.has(id)) errors.push(`job_id "${id}" is missing; put it in selected or rejected`);
      }
      if (out.selected.length > criteria.max_jobs) {
        errors.push(`selected has ${out.selected.length} jobs; the limit is ${criteria.max_jobs}`);
      }
      for (const [i, s] of out.selected.entries()) {
        if (s.match_score < 0 || s.match_score > 100) errors.push(`selected[${i}].match_score is ${s.match_score}; it must be 0-100`);
        const job = byId.get(s.job_id);
        if (job?.salary_monthly_usd != null && job.salary_monthly_usd < criteria.min_monthly_usd) {
          errors.push(
            `job_id "${s.job_id}" pays $${job.salary_monthly_usd}/month, below the $${criteria.min_monthly_usd} floor, so it must be rejected`,
          );
        }
      }
      return errors;
    };
  },
};
