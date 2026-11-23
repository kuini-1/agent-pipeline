import { ReviewOutput } from "../schemas.js";
import type { ReviewRequest } from "../protocol.js";
import { json, type Agent } from "./agent.js";

export const reviewerAgent: Agent<ReviewRequest, ReviewOutput> = {
  name: "reviewer",
  schema: ReviewOutput,
  maxTokens: 8000,
  system: `You review a cover letter and resume bullets before they are sent to an employer. You did not write them.

Check, in this order:
1. Truthfulness: every statement about the candidate must be supported by the candidate profile. List any that are not in unsupported_claims, quoted from the draft. An unsupported claim is a blocker.
2. Fit: the letter addresses the job's key requirements with the candidate's most relevant work.
3. Specificity: it is clearly written for this company and posting, not a template.
4. Quality: clear, professional, no filler, no placeholders.

Verdict "approve" only if there are no blocker or major issues. Otherwise "revise", with each issue paired with a concrete fix the writer can apply. score is 1-10 for how ready the draft is to send.`,

  prompt({ profile, job, research, draft }) {
    return `<candidate>\n${json(profile)}\n</candidate>\n\n<job>\n${json(job)}\n</job>\n\n<research_notes>\n${json(research)}\n</research_notes>\n\n<draft>\n${json(draft)}\n</draft>`;
  },

  check({ job }) {
    return (out) => {
      const errors: string[] = [];
      if (out.job_id !== job.id) errors.push(`job_id is "${out.job_id}"; it must be "${job.id}"`);
      if (out.score < 1 || out.score > 10) errors.push(`score is ${out.score}; it must be 1-10`);
      const serious = out.issues.filter((i) => i.severity !== "minor");
      if (out.verdict === "approve" && serious.length > 0) {
        errors.push(`verdict is "approve" but there are ${serious.length} blocker/major issue(s); use "revise" or downgrade them`);
      }
      if (out.verdict === "approve" && out.unsupported_claims.length > 0) {
        errors.push('verdict is "approve" but unsupported_claims is not empty; unsupported claims are blockers');
      }
      if (out.verdict === "revise" && out.issues.length === 0) {
        errors.push('verdict is "revise" but issues is empty; say what to fix');
      }
      return errors;
    };
  },
};
