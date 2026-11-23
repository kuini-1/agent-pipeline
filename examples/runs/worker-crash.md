# Run report: `run-20261123-055052-dff3`

> Produced with the deterministic **mock model**: rule-based output, no API calls, and token counts estimated as characters / 4. It shows how the pipeline behaves, not the quality of a real model's writing.

| | |
|---|---|
| Status | finished |
| Model | `mock` |
| Job source | `fixture:examples/jobs.json` (8 postings) |
| Started | 2026-11-23T05:50:52.819Z |
| Duration | 46.9 s |
| Model calls | 7 (0 returned invalid output) |
| Tokens | 13,297 (estimated) |
| Cost | none (mock model) |
| Limits | 10 min per run, 400,000 tokens, 2 revisions per job, 2 repair rounds per step, 3 deliveries per step |

## Outcome

3 of 8 postings selected: 3 approved.

| # | Job | Company | Match | Result | Revisions | Review |
|---|---|---|---|---|---|---|
| 1 | [LLM Platform Engineer](https://example.com/jobs/quillstack-llm-platform) | Quillstack | 88 | approved | 0 | 8/10, approve |
| 2 | [AI Engineer, Retrieval](https://example.com/jobs/tidewater-ai-engineer) | Tidewater Analytics | 88 | approved | 0 | 8/10, approve |
| 3 | [Applied AI Engineer](https://example.com/jobs/brightloop-applied-ai) | Brightloop | 64 | approved | 0 | 8/10, approve |

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

- writer, revision 0: started again: the worker running it stopped before finishing
- writer, revision 0: model call: valid (1,834 tokens, 4018 ms)
- writer, revision 0: draft ready: 194 words, 10 claims checked
- reviewer, revision 0: model call: valid (1,911 tokens, 4011 ms)
- reviewer, revision 0: approve, 8/10 (minor: The company is named only in the greeting.)

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

**Review:** approve, 8/10
- minor: The company is named only in the greeting. Fix: Mention it once in the body.

### 2. AI Engineer, Retrieval, Tidewater Analytics (approved)

[Posting](https://example.com/jobs/tidewater-ai-engineer) · Remote, APAC · salary $5,200/month

**Why it matched:** Mentions LLM, AI engineer, RAG, Go, Python, PostgreSQL, LLM evaluation, vector search.

**Path:**

- writer, revision 0: started again: the worker running it stopped before finishing
- writer, revision 0: model call: valid (1,811 tokens, 4019 ms)
- writer, revision 0: draft ready: 194 words, 10 claims checked
- reviewer, revision 0: model call: valid (1,886 tokens, 4008 ms)
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

### 3. Applied AI Engineer, Brightloop (approved)

[Posting](https://example.com/jobs/brightloop-applied-ai) · Remote, Worldwide · salary not listed

**Why it matched:** Mentions LLM, AI engineer, TypeScript, Go.
**Concerns:** salary not listed

**Path:**

- writer, revision 0: started again: the worker running it stopped before finishing
- writer, revision 0: model call: valid (1,762 tokens, 4019 ms)
- writer, revision 0: draft ready: 193 words, 8 claims checked
- reviewer, revision 0: model call: valid (1,825 tokens, 4009 ms)
- reviewer, revision 0: approve, 8/10 (minor: The company is named only in the greeting.)

**Cover letter**

> Dear Brightloop team,
>
> I'm applying for the Applied AI Engineer role. I'm a senior full-stack engineer building LLM applications in Go and TypeScript, and your posting asks for LLM, AI engineer and TypeScript, which matches the work I have been doing.
>
> At Patchwork Health, as Full-Stack Engineer, I shipped a TypeScript and Go appointment platform used by 60 clinics across Southeast Asia.
>
> At Lumen Freight, as Senior Software Engineer, I moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2. I also built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five.
>
> Day to day I work in Go and TypeScript, which overlaps with the stack in your posting.
>
> Outside of work I built ticket-triage: an open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human.
>
> I'm based in Chiang Mai, Thailand and work remotely. I'd welcome a short call to walk through any of this work in more detail. Thank you for your time.
>
> Riley Tan

**Resume bullets**

- Shipped a TypeScript and Go appointment platform used by 60 clinics across Southeast Asia.
- Moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2.
- Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five.
- ticket-triage: An open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human.

**Claims checked against the profile**

| Claim | Evidence (verbatim from profile) |
|---|---|
| Is a senior full-stack engineer building LLM applications in Go and TypeScript | Senior full-stack engineer building LLM applications in Go and TypeScript |
| Shipped a TypeScript and Go appointment platform used by 60 clinics across Southeast Asia (Patchwork Health) | Shipped a TypeScript and Go appointment platform used by 60 clinics across Southeast Asia. |
| Moved document ingestion from cron scripts to a Redis job queue in Go (Lumen Freight) | Moved document ingestion from cron scripts to a Redis job queue in Go, cutting failed imports from about 40 a week to 2. |
| Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five (Lumen Freight) | Built a RAG pipeline over 1.2 million shipping documents so support agents could answer customs questions with one search instead of five. |
| Works with Go | Go |
| Works with TypeScript | TypeScript |
| Built ticket-triage | An open-source tool that routes support tickets to the right team with an LLM classifier and sends low-confidence cases to a human. |
| Based in Chiang Mai, Thailand | Chiang Mai, Thailand |

**Review:** approve, 8/10
- minor: The company is named only in the greeting. Fix: Mention it once in the body.

## Failures and recoveries

- `writer` on `fx-quillstack-llm-platform`, revision 0: the worker running this step stopped before it finished, so nothing was recorded. The queue gave the message to a worker again once its lock expired.
- `writer` on `fx-tidewater-retrieval`, revision 0: the worker running this step stopped before it finished, so nothing was recorded. The queue gave the message to a worker again once its lock expired.
- `writer` on `fx-brightloop-applied-ai`, revision 0: the worker running this step stopped before it finished, so nothing was recorded. The queue gave the message to a worker again once its lock expired.

## Timeline

| Time | Agent | Job | Event |
|---|---|---|---|
| +0.017s | client |  | run created: model mock, source fixture:examples/jobs.json |
| +0.019s | client |  | sent to research |
| +0.021s | research |  | started |
| +0.022s | research |  | 8 postings from fixture:examples/jobs.json |
| +4.033s | research |  | model call: valid (2,268 tokens, 4008 ms) |
| +4.034s | research |  | selected 3, rejected 5 |
| +4.038s | research | fx-quillstack-llm-platform | sent to writer |
| +4.038s | writer | fx-quillstack-llm-platform | started |
| +4.041s | research | fx-tidewater-retrieval | sent to writer |
| +4.041s | writer | fx-tidewater-retrieval | started |
| +4.043s | research | fx-brightloop-applied-ai | sent to writer |
| +4.043s | writer | fx-brightloop-applied-ai | started |
| +38.885s | writer | fx-quillstack-llm-platform | started again: the worker running it stopped before finishing |
| +38.885s | writer | fx-tidewater-retrieval | started again: the worker running it stopped before finishing |
| +38.885s | writer | fx-brightloop-applied-ai | started again: the worker running it stopped before finishing |
| +42.909s | writer | fx-quillstack-llm-platform | model call: valid (1,834 tokens, 4018 ms) |
| +42.909s | writer | fx-tidewater-retrieval | model call: valid (1,811 tokens, 4019 ms) |
| +42.909s | writer | fx-brightloop-applied-ai | model call: valid (1,762 tokens, 4019 ms) |
| +42.910s | writer | fx-quillstack-llm-platform | draft ready: 194 words, 10 claims checked |
| +42.910s | writer | fx-tidewater-retrieval | draft ready: 194 words, 10 claims checked |
| +42.910s | writer | fx-brightloop-applied-ai | draft ready: 193 words, 8 claims checked |
| +42.915s | writer | fx-quillstack-llm-platform | sent to reviewer |
| +42.916s | writer | fx-tidewater-retrieval | sent to reviewer |
| +42.916s | writer | fx-brightloop-applied-ai | sent to reviewer |
| +42.918s | reviewer | fx-quillstack-llm-platform | started |
| +42.922s | reviewer | fx-tidewater-retrieval | started |
| +42.922s | reviewer | fx-brightloop-applied-ai | started |
| +46.931s | reviewer | fx-quillstack-llm-platform | model call: valid (1,911 tokens, 4011 ms) |
| +46.931s | reviewer | fx-tidewater-retrieval | model call: valid (1,886 tokens, 4008 ms) |
| +46.931s | reviewer | fx-brightloop-applied-ai | model call: valid (1,825 tokens, 4009 ms) |
| +46.931s | reviewer | fx-quillstack-llm-platform | approve, 8/10 (minor: The company is named only in the greeting.) |
| +46.932s | reviewer | fx-tidewater-retrieval | approve, 8/10 (minor: The company is named only in the greeting.) |
| +46.932s | reviewer | fx-brightloop-applied-ai | approve, 8/10 (minor: The company is named only in the greeting.) |
| +46.933s | reviewer | fx-quillstack-llm-platform | approved |
| +46.934s | reviewer | fx-tidewater-retrieval | approved |
| +46.934s | reviewer | fx-brightloop-applied-ai | approved |
| +46.936s | reviewer |  | sent to report |
