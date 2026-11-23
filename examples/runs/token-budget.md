# Run report: `example-token-budget`

> Produced with the deterministic **mock model**: rule-based output, no API calls, and token counts estimated as characters / 4. It shows how the pipeline behaves, not the quality of a real model's writing.

| | |
|---|---|
| Status | stopped early: token budget used (7675 of 6000) |
| Model | `mock` |
| Job source | `fixture:examples/jobs.json` (8 postings) |
| Started | 2026-11-23T05:52:48.457Z |
| Duration | 166 ms |
| Model calls | 4 (0 returned invalid output) |
| Tokens | 7,675 (estimated) |
| Cost | none (mock model) |
| Limits | 10 min per run, 6,000 tokens, 2 revisions per job, 2 repair rounds per step, 3 deliveries per step |

## Outcome

3 of 8 postings selected: 3 stopped.

| # | Job | Company | Match | Result | Revisions | Review |
|---|---|---|---|---|---|---|
| 1 | [LLM Platform Engineer](https://example.com/jobs/quillstack-llm-platform) | Quillstack | 88 | stopped | 0 | - |
| 2 | [AI Engineer, Retrieval](https://example.com/jobs/tidewater-ai-engineer) | Tidewater Analytics | 88 | stopped | 0 | - |
| 3 | [Applied AI Engineer](https://example.com/jobs/brightloop-applied-ai) | Brightloop | 64 | stopped | 0 | - |

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

### 1. LLM Platform Engineer, Quillstack (stopped)

[Posting](https://example.com/jobs/quillstack-llm-platform) · Remote, Worldwide · salary $6,500/month

**Why it matched:** Mentions LLM, RAG, TypeScript, Go, PostgreSQL, Redis, React.

**Why it ended here:** token budget used (7675 of 6000)

**Path:**

- writer, revision 0: model call: valid (1,834 tokens, 43 ms)
- writer, revision 0: draft ready: 194 words, 10 claims checked
- reviewer, revision 0: stopped: token budget used (7675 of 6000)

_Last draft that passed validation:_

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

### 2. AI Engineer, Retrieval, Tidewater Analytics (stopped)

[Posting](https://example.com/jobs/tidewater-ai-engineer) · Remote, APAC · salary $5,200/month

**Why it matched:** Mentions LLM, AI engineer, RAG, Go, Python, PostgreSQL, LLM evaluation, vector search.

**Why it ended here:** token budget used (7675 of 6000)

**Path:**

- writer, revision 0: model call: valid (1,811 tokens, 41 ms)
- writer, revision 0: draft ready: 194 words, 10 claims checked
- reviewer, revision 0: stopped: token budget used (7675 of 6000)

_Last draft that passed validation:_

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

### 3. Applied AI Engineer, Brightloop (stopped)

[Posting](https://example.com/jobs/brightloop-applied-ai) · Remote, Worldwide · salary not listed

**Why it matched:** Mentions LLM, AI engineer, TypeScript, Go.
**Concerns:** salary not listed

**Why it ended here:** token budget used (7675 of 6000)

**Path:**

- writer, revision 0: model call: valid (1,762 tokens, 41 ms)
- writer, revision 0: draft ready: 193 words, 8 claims checked
- reviewer, revision 0: stopped: token budget used (7675 of 6000)

_Last draft that passed validation:_

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

## Failures and recoveries

- `reviewer` on `fx-quillstack-llm-platform`, revision 0: stopped before calling the model (token budget used (7675 of 6000)).
- `reviewer` on `fx-tidewater-retrieval`, revision 0: stopped before calling the model (token budget used (7675 of 6000)).
- `reviewer` on `fx-brightloop-applied-ai`, revision 0: stopped before calling the model (token budget used (7675 of 6000)).

## Timeline

| Time | Agent | Job | Event |
|---|---|---|---|
| +0.018s | client |  | run created: model mock, source fixture:examples/jobs.json |
| +0.026s | client |  | sent to research |
| +0.027s | research |  | started |
| +0.029s | research |  | 8 postings from fixture:examples/jobs.json |
| +0.090s | research |  | model call: valid (2,268 tokens, 58 ms) |
| +0.094s | research |  | selected 3, rejected 5 |
| +0.098s | research | fx-quillstack-llm-platform | sent to writer |
| +0.102s | writer | fx-quillstack-llm-platform | started |
| +0.103s | research | fx-tidewater-retrieval | sent to writer |
| +0.105s | writer | fx-tidewater-retrieval | started |
| +0.105s | research | fx-brightloop-applied-ai | sent to writer |
| +0.108s | writer | fx-brightloop-applied-ai | started |
| +0.148s | writer | fx-quillstack-llm-platform | model call: valid (1,834 tokens, 43 ms) |
| +0.148s | writer | fx-tidewater-retrieval | model call: valid (1,811 tokens, 41 ms) |
| +0.152s | writer | fx-quillstack-llm-platform | draft ready: 194 words, 10 claims checked |
| +0.152s | writer | fx-tidewater-retrieval | draft ready: 194 words, 10 claims checked |
| +0.153s | writer | fx-brightloop-applied-ai | model call: valid (1,762 tokens, 41 ms) |
| +0.154s | writer | fx-brightloop-applied-ai | draft ready: 193 words, 8 claims checked |
| +0.157s | writer | fx-quillstack-llm-platform | sent to reviewer |
| +0.157s | writer | fx-tidewater-retrieval | sent to reviewer |
| +0.158s | writer | fx-brightloop-applied-ai | sent to reviewer |
| +0.160s | reviewer | fx-quillstack-llm-platform | stopped: token budget used (7675 of 6000) |
| +0.161s | reviewer | fx-quillstack-llm-platform | stopped: token budget used (7675 of 6000) |
| +0.161s | reviewer | fx-tidewater-retrieval | stopped: token budget used (7675 of 6000) |
| +0.161s | reviewer | fx-brightloop-applied-ai | stopped: token budget used (7675 of 6000) |
| +0.163s | reviewer | fx-tidewater-retrieval | stopped: token budget used (7675 of 6000) |
| +0.163s | reviewer | fx-brightloop-applied-ai | stopped: token budget used (7675 of 6000) |
| +0.166s | reviewer |  | sent to report |
