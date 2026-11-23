import { WriterOutput, type CandidateProfile } from "../schemas.js";
import type { WriteRequest } from "../protocol.js";
import { countWords, findPlaceholder, json, normalize, type Agent } from "./agent.js";

export const minWords = 180;
export const maxWords = 320;

/** Every text field of the profile, so evidence can be matched against one field at a time. */
export function profileFields(p: CandidateProfile): string[] {
  return [
    p.name,
    p.headline,
    p.location,
    ...p.skills,
    ...p.experience.flatMap((e) => [e.company, e.role, e.period, ...e.highlights]),
    ...p.projects.flatMap((pr) => [pr.name, pr.summary]),
  ];
}

/**
 * Evidence counts if it is a whole profile field ("Go"), or an exact excerpt
 * of one that is long enough not to match by accident.
 */
export function supported(normalizedFields: string[], evidence: string): boolean {
  const ev = normalize(evidence);
  return normalizedFields.some((f) => f === ev || (ev.length >= 12 && f.includes(ev)));
}

export const writerAgent: Agent<WriteRequest, WriterOutput> = {
  name: "writer",
  schema: WriterOutput,
  maxTokens: 12000,
  system: `You write a cover letter and tailored resume bullets for one candidate applying to one job.

Use only facts from the candidate profile. Do not invent employers, titles, numbers, skills or results, and do not stretch a fact into a bigger one. Every factual statement about the candidate in the letter or bullets gets an entry in claims, with evidence copied word for word from a single field of the profile.

The letter is ${minWords}-${maxWords} words of plain text in short paragraphs. Open with "Dear <company> team," using the real company name. Connect the candidate's most relevant work to the job's key requirements, and say something specific about this company's posting. No placeholders, no brackets, no made-up names of hiring managers.

resume_bullets are 3-5 bullets rewritten from the candidate's experience to match this job's wording, still factually identical to the profile.

If you are given a previous draft and reviewer feedback, fix every issue the reviewer raised and keep what was already good.`,

  prompt({ profile, job, research, previous, feedback }) {
    let p = `<candidate>\n${json(profile)}\n</candidate>\n\n<job>\n${json(job)}\n</job>\n\n<research_notes>\n${json(research)}\n</research_notes>`;
    if (previous && feedback) {
      p += `\n\n<previous_draft>\n${json(previous)}\n</previous_draft>\n\n<reviewer_feedback>\n${json(feedback)}\n</reviewer_feedback>\n\nRevise the draft to address the feedback.`;
    }
    return p;
  },

  check({ profile, job }) {
    const fields = profileFields(profile).map(normalize);
    return (out) => {
      const errors: string[] = [];
      if (out.job_id !== job.id) errors.push(`job_id is "${out.job_id}"; it must be "${job.id}"`);

      const words = countWords(out.cover_letter);
      if (words < minWords || words > maxWords) errors.push(`cover_letter has ${words} words; it must have ${minWords}-${maxWords}`);
      const ph = findPlaceholder(out.cover_letter);
      if (ph) errors.push(`cover_letter contains a placeholder: "${ph}"`);

      if (out.resume_bullets.length < 3 || out.resume_bullets.length > 5) {
        errors.push(`resume_bullets has ${out.resume_bullets.length} items; it must have 3-5`);
      }
      for (const [i, b] of out.resume_bullets.entries()) {
        const bph = findPlaceholder(b);
        if (bph) errors.push(`resume_bullets[${i}] contains a placeholder: "${bph}"`);
      }

      if (out.claims.length === 0) errors.push("claims is empty; list each factual claim about the candidate with its evidence");
      for (const [i, c] of out.claims.entries()) {
        if (!supported(fields, c.evidence)) {
          errors.push(`claims[${i}].evidence is not text from the profile: "${c.evidence}". Copy the supporting text exactly, or remove the claim from the letter`);
        }
      }
      return errors;
    };
  },
};
