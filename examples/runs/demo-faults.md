# Run report: `example-demo-faults`

> Produced with the deterministic **mock model**: rule-based output, no API calls, and token counts estimated as characters / 4. It shows how the pipeline behaves, not the quality of a real model's writing.
>
> Fault injection was on (`unsupportedClaim` on job #1, `reviseOnce` on job #1, `transientError` on job #2, `alwaysInvalid` on job #3), so the failures below were planned, to exercise the recovery paths.

| | |
|---|---|
| Status | finished |
| Model | `mock` |
| Job source | `fixture:examples/jobs.json` (8 postings) |
| Started | 2026-11-23T05:52:45.481Z |
| Duration | 2.3 s |
| Model calls | 11 (4 returned invalid output) |
| Tokens | 22,287 (estimated) |
| Cost | none (mock model) |
| Limits | 10 min per run, 400,000 tokens, 2 revisions per job, 2 repair rounds per step, 3 deliveries per step |

## Outcome

3 of 8 postings selected: 2 approved, 1 failed.

| # | Job | Company | Match | Result | Revisions | Review |
|---|---|---|---|---|---|---|
| 1 | [LLM Platform Engineer](https://example.com/jobs/quillstack-llm-platform) | Quillstack | 88 | approved | 1 | 9/10, approve |
| 2 | [AI Engineer, Retrieval](https://example.com/jobs/tidewater-ai-engineer) | Tidewater Analytics | 88 | approved | 0 | 8/10, approve |
| 3 | [Applied AI Engineer](https://example.com/jobs/brightloop-applied-ai) | Brightloop | 64 | failed | 0 | - |

## Search

- Candidate: Riley Tan, Senior full-stack engineer building LLM applications in Go and TypeScript (Chiang Mai, Thailand)
- Keywords: LLM, AI engineer, RAG, TypeScript, Go
- Salary floor: $3,000/month; must be open to Thailand; up to 3 jobs

### Selected

| Job | Score | Why | Concerns |
|---|---|---|---|
| LLM Platform Engineer, Quillstack | 88 | Mentions LLM, RAG, TypeScript, Go, PostgreSQL, Redis, React. | - |
| AI Engineer, Retrieval, Tidewater Analytics | 88 | Mentions LLM, AI engineer, RAG, Go, Python, PostgreSQL, LLM evaluation, vector search. | - |
| Applied AI Engineer, Brightloop | 64 | Mentions LLM, AI engineer, TypeScript, Go. | salary not listed |

### Rejected

| Job | Reason |
|---|---|
| Machine Learning Intern, Copperleaf | Pays $1,200/month, below the $3,000 floor. |
| Senior AI Engineer, Harborline | Not open to candidates in Thailand (location: Remote, US only). |
| LLM Engineer, Northpass | Not open to candidates in Thailand (location: Remote, Europe (UTC-1 to UTC+3)). |
| Data Analyst, Meridian Goods | Weak match (score 0): the posting shares few of the candidate's keywords and skills. |
| Full-Stack Engineer, AI Features, Glimmer Labs | Passed the filters but scored 48, below the 3 selected jobs. |

## Applications

### 1. LLM Platform Engineer, Quillstack (approved)

[Posting](https://example.com/jobs/quillstack-llm-platform) · Remote, Worldwide · salary $6,500/month

**Why it matched:** Mentions LLM, RAG, TypeScript, Go, PostgreSQL, Redis, React.

**Path:**

- writer, revision 0: model call: invalid, 1 error(s) (1,890 tokens, 42 ms)
- writer, revision 0: repair round 1: valid (2,759 tokens, 42 ms)
- writer, revision 0: draft ready: 194 words, 10 claims checked
- reviewer, revision 0: model call: valid (1,936 tokens, 42 ms)
- reviewer, revision 0: revise, 6/10 (major: The letter never says why Quillstack in particular; with the name swapped it could go to any employer.)
- writer, revision 1: model call: valid (2,882 tokens, 42 ms)
- writer, revision 1: draft ready: 235 words, 10 claims checked
- reviewer, revision 1: model call: valid (1,941 tokens, 40 ms)
- reviewer, revision 1: approve, 9/10

**Cover letter**

> Dear Quillstack team,
>
> I'm applying for the LLM Platform Engineer role. I'm a senior full-stack engineer building LLM applications in Go and TypeScript, and your posting asks for LLM, RAG and TypeScript, which matches the work I have been doing.
>
> At Lumen Freight, as Senior Software Engineer, I moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2. I also built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five.
>
> At Patchwork Health, as Full-Stack Engineer, I shipped a TypeScript and Go appointment platform used by 60 clinics across Southeast Asia.
>
> Day to day I work in Go, TypeScript, PostgreSQL and Redis, which overlaps with the stack in your posting.
>
> Outside of work I built ticket-triage: an open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human.
>
> What draws me to Quillstack is this line from your posting: "Quillstack builds writing tools for legal teams, and every feature we ship runs on our internal LLM platform." That is the kind of problem I want to work on next.
>
> I'm based in Chiang Mai, Thailand and work remotely. I'd welcome a short call to walk through any of this work in more detail. Thank you for your time.
>
> Riley Tan

**Resume bullets**

- Moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2.
- Shipped a TypeScript and Go appointment platform used by 60 clinics across Southeast Asia.
- Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five.
- ticket-triage: An open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human.

**Claims checked against the profile**

| Claim | Evidence (verbatim from profile) |
|---|---|
| Is a senior full-stack engineer building LLM applications in Go and TypeScript | Senior full-stack engineer building LLM applications in Go and TypeScript |
| Moved document ingestion from cron scripts to a Redis job queue in Go (Lumen Freight) | Moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2. |
| Shipped a TypeScript and Go appointment platform used by 60 clinics across Southeast Asia (Patchwork Health) | Shipped a TypeScript and Go appointment platform used by 60 clinics across Southeast Asia. |
| Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five (Lumen Freight) | Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five. |
| Works with Go | Go |
| Works with TypeScript | TypeScript |
| Works with PostgreSQL | PostgreSQL |
| Works with Redis | Redis |
| Built ticket-triage | An open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human. |
| Based in Chiang Mai, Thailand | Chiang Mai, Thailand |

**Review:** approve, 9/10

### 2. AI Engineer, Retrieval, Tidewater Analytics (approved)

[Posting](https://example.com/jobs/tidewater-ai-engineer) · Remote, APAC · salary $5,200/month

**Why it matched:** Mentions LLM, AI engineer, RAG, Go, Python, PostgreSQL, LLM evaluation, vector search.

**Path:**

- writer, revision 0: model call: valid (1,811 tokens, 41 ms)
- writer, revision 0: draft ready: 194 words, 10 claims checked
- reviewer, revision 0: error, will retry: mock: 529 overloaded
- reviewer, revision 0: model call: valid (1,886 tokens, 42 ms)
- reviewer, revision 0: approve, 8/10 (minor: The company is named only in the greeting.)

**Cover letter**

> Dear Tidewater Analytics team,
>
> I'm applying for the AI Engineer, Retrieval role. I'm a senior full-stack engineer building LLM applications in Go and TypeScript, and your posting asks for LLM, AI engineer and RAG, which matches the work I have been doing.
>
> At Lumen Freight, as Senior Software Engineer, I built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five. I also designed an LLM evaluation harness with 400 graded test cases that caught three prompt regressions before release. I also moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2.
>
> Day to day I work in Go, Python, PostgreSQL and RAG, which overlaps with the stack in your posting.
>
> Outside of work I built ticket-triage: an open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human.
>
> I'm based in Chiang Mai, Thailand and work remotely. I'd welcome a short call to walk through any of this work in more detail. Thank you for your time.
>
> Riley Tan

**Resume bullets**

- Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five.
- Designed an LLM evaluation harness with 400 graded test cases that caught three prompt regressions before release.
- Moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2.
- ticket-triage: An open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human.

**Claims checked against the profile**

| Claim | Evidence (verbatim from profile) |
|---|---|
| Is a senior full-stack engineer building LLM applications in Go and TypeScript | Senior full-stack engineer building LLM applications in Go and TypeScript |
| Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five (Lumen Freight) | Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five. |
| Designed an LLM evaluation harness with 400 graded test cases that caught three prompt regressions before release (Lumen Freight) | Designed an LLM evaluation harness with 400 graded test cases that caught three prompt regressions before release. |
| Moved document ingestion from cron scripts to a Redis job queue in Go (Lumen Freight) | Moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2. |
| Works with Go | Go |
| Works with Python | Python |
| Works with PostgreSQL | PostgreSQL |
| Works with RAG | RAG |
| Built ticket-triage | An open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human. |
| Based in Chiang Mai, Thailand | Chiang Mai, Thailand |

**Review:** approve, 8/10
- minor: The company is named only in the greeting. Fix: Mention it once in the body.

### 3. Applied AI Engineer, Brightloop (failed)

[Posting](https://example.com/jobs/brightloop-applied-ai) · Remote, Worldwide · salary not listed

**Why it matched:** Mentions LLM, AI engineer, TypeScript, Go.
**Concerns:** salary not listed

**Why it ended here:** writer output still invalid after 2 repair round(s): cover_letter has 36 words; it must have 180-320; cover_letter contains a placeholder: "[Hiring Manager]"

**Path:**

- writer, revision 0: model call: invalid, 1 error(s) (1,061 tokens, 41 ms)
- writer, revision 0: repair round 1: invalid, 2 error(s) (1,635 tokens, 39 ms)
- writer, revision 0: repair round 2: invalid, 2 error(s) (2,218 tokens, 42 ms)
- writer, revision 0: failed: writer output still invalid after 2 repair round(s): cover_letter has 36 words; it must have 180-320; cover_letter contains a placeholder: "[Hiring Manager]"

## Failures and recoveries

- `writer` on `fx-quillstack-llm-platform`, revision 0, first call: output failed validation; sent back with the errors for a repair round.
  - claims[10].evidence is not text from the profile: "Led a 15-person ML platform team at a Fortune 500 retailer". Copy the supporting text exactly, or remove the claim from the letter
- `writer` on `fx-brightloop-applied-ai`, revision 0, first call: output failed validation; sent back with the errors for a repair round.
  - the output was cut off at the token limit; write less in each field
- `writer` on `fx-brightloop-applied-ai`, revision 0, repair round 1: output failed validation; sent back with the errors for a repair round.
  - cover_letter has 36 words; it must have 180-320
  - cover_letter contains a placeholder: "[Hiring Manager]"
- `reviewer` on `fx-tidewater-retrieval`, revision 0, delivery 1: mock: 529 overloaded. Retried by the queue with backoff.
- `writer` on `fx-brightloop-applied-ai`, revision 0, repair round 2: output failed validation; no repair rounds left, so the job failed.
  - cover_letter has 36 words; it must have 180-320
  - cover_letter contains a placeholder: "[Hiring Manager]"
- `writer` on `fx-brightloop-applied-ai`, revision 0: **failed** (writer output still invalid after 2 repair round(s): cover_letter has 36 words; it must have 180-320; cover_letter contains a placeholder: "[Hiring Manager]"). Recorded as the job's result; the other jobs carried on.

## Timeline

| Time | Agent | Job | Event |
|---|---|---|---|
| +0.028s | client |  | run created: model mock, source fixture:examples/jobs.json |
| +0.034s | client |  | sent to research |
| +0.035s | research |  | started |
| +0.037s | research |  | 8 postings from fixture:examples/jobs.json |
| +0.115s | research |  | model call: valid (2,268 tokens, 75 ms) |
| +0.117s | research |  | selected 3, rejected 5 |
| +0.122s | research | fx-quillstack-llm-platform | sent to writer |
| +0.125s | research | fx-tidewater-retrieval | sent to writer |
| +0.125s | writer | fx-quillstack-llm-platform | started |
| +0.128s | writer | fx-tidewater-retrieval | started |
| +0.128s | research | fx-brightloop-applied-ai | sent to writer |
| +0.132s | writer | fx-brightloop-applied-ai | started |
| +0.170s | writer | fx-quillstack-llm-platform | model call: invalid, 1 error(s) (1,890 tokens, 42 ms) |
| +0.170s | writer | fx-tidewater-retrieval | model call: valid (1,811 tokens, 41 ms) |
| +0.171s | writer | fx-tidewater-retrieval | draft ready: 194 words, 10 claims checked |
| +0.176s | writer | fx-brightloop-applied-ai | model call: invalid, 1 error(s) (1,061 tokens, 41 ms) |
| +0.176s | writer | fx-tidewater-retrieval | sent to reviewer |
| +0.178s | reviewer | fx-tidewater-retrieval | started |
| +0.214s | writer | fx-quillstack-llm-platform | repair round 1: valid (2,759 tokens, 42 ms) |
| +0.216s | writer | fx-quillstack-llm-platform | draft ready: 194 words, 10 claims checked |
| +0.219s | writer | fx-brightloop-applied-ai | repair round 1: invalid, 2 error(s) (1,635 tokens, 39 ms) |
| +0.220s | reviewer | fx-tidewater-retrieval | error, will retry: mock: 529 overloaded |
| +0.220s | writer | fx-quillstack-llm-platform | sent to reviewer |
| +0.228s | reviewer | fx-quillstack-llm-platform | started |
| +0.264s | writer | fx-brightloop-applied-ai | repair round 2: invalid, 2 error(s) (2,218 tokens, 42 ms) |
| +0.266s | writer | fx-brightloop-applied-ai | failed: writer output still invalid after 2 repair round(s): cover_letter has 36 words; it must have 180-320; cover_letter contains a placeholder: "[Hiring Manager]" |
| +0.268s | writer | fx-brightloop-applied-ai | failed: writer output still invalid after 2 repair round(s): cover_letter has 36 words; it must have 180-320; cover_letter contains a placeholder: "[Hiring Manager]" |
| +0.271s | reviewer | fx-quillstack-llm-platform | model call: valid (1,936 tokens, 42 ms) |
| +0.272s | reviewer | fx-quillstack-llm-platform | revise, 6/10 (major: The letter never says why Quillstack in particular; with the name swapped it could go to any employer.) |
| +0.277s | reviewer | fx-quillstack-llm-platform | sent to writer (revision 1) |
| +0.278s | writer | fx-quillstack-llm-platform | started |
| +0.324s | writer | fx-quillstack-llm-platform | model call: valid (2,882 tokens, 42 ms) |
| +0.324s | writer | fx-quillstack-llm-platform | draft ready: 235 words, 10 claims checked |
| +0.333s | writer | fx-quillstack-llm-platform | sent to reviewer (revision 1) |
| +0.336s | reviewer | fx-quillstack-llm-platform | started |
| +0.379s | reviewer | fx-quillstack-llm-platform | model call: valid (1,941 tokens, 40 ms) |
| +0.380s | reviewer | fx-quillstack-llm-platform | approve, 9/10 |
| +0.383s | reviewer | fx-quillstack-llm-platform | approved |
| +2.245s | reviewer | fx-tidewater-retrieval | started (delivery 2) |
| +2.290s | reviewer | fx-tidewater-retrieval | model call: valid (1,886 tokens, 42 ms) |
| +2.291s | reviewer | fx-tidewater-retrieval | approve, 8/10 (minor: The company is named only in the greeting.) |
| +2.296s | reviewer | fx-tidewater-retrieval | approved |
| +2.300s | reviewer |  | sent to report |
