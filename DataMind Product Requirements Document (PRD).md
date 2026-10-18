# DataMind: Product Requirements Document (PRD)

*Version 1.0, draft for team review, 18 October 2026. Product: DataMind (working title), our entry for problem statement PS1, “DataMind: Talk to Your Data”. Companion document: DataMind Tech Stack and Engineering Guide. Items marked \[A\] are assumptions the team should confirm.*

| Item | Detail |
| --- | --- |
| Product | DataMind, a natural-language data assistant that shows its work |
| Track | PS1: Talk to Your Data |
| Required technology | Snowflake (data platform), Google Gemma (AI model), open-source release |
| Status | Draft v1.0 |
| Owner | To be assigned |
| Team size and deadline | Not yet confirmed \[A\]. Planning uses relative phases so it fits any schedule. |

## 1. Purpose and how to use this document

A PRD (Product Requirements Document) is the one place that says what we are building, for whom, why, and how we will know it works. It does not say how to write the code; the Tech Stack document does that. If anyone asks “is this in scope, and how is it tested?”, the answer should be here.

**Conventions**

- IDs: G = goal, NG = non-goal, P = persona, US = user story, FR = functional requirement, NFR = non-functional requirement, EC = edge case, T = test group, RK = risk.
- Priority: **Must** = needed to meet a mandatory requirement or to avoid the trust cap. **Should** = clearly raises the score. **Could** = stretch.
- M1 to M8 are the mandatory features in the problem statement. C1 to C8 are the eight scoring criteria in the rubric: C1 correctness (20 points), C2 natural-language interaction (10), C3 evidence and explainability (15), C4 Snowflake integration (15), C5 Gemma integration (12), C6 ambiguity, errors and missing data (12), C7 reusability (8), C8 practical relevance and user experience (8).
- **Trust cap:** a Poor result on C1 (under 5 of its 20 points) caps the whole PS1 score at 50. Correctness work therefore comes first.

## 2. Product overview

**Vision.** Anyone who understands the question should get a trustworthy, checkable answer from the organization’s data in seconds, without writing a query.

**Problem.** Organizations keep information in databases and spreadsheets, but getting an answer needs technical skills, specialised queries or hours of searching. The people who understand the questions best are often the least able to reach the data. Chatbots that answer in fluent text without checking the data cannot be trusted for decisions.

**Solution in one paragraph.** A person types a question. Gemma (the AI model) works out what is being asked and drafts a SQL query (SQL is the language used to ask questions of tables). Ordinary code checks that the query is safe and valid. Snowflake runs it. Gemma then explains the returned rows in plain language, and code verifies every number against those rows. The screen shows the answer, an explanation of how it was obtained, and an evidence panel with the exact query, the Snowflake query ID and the result rows.

**How DataMind differs from an ordinary chatbot**

| Topic | Ordinary chatbot | DataMind |
| --- | --- | --- |
| Source of facts | Patterns learned in training | Rows returned by a live Snowflake query |
| Numbers | Can be invented | Taken from, or verified against, returned rows |
| Proof | None | Query, query ID, rows, tables used |
| Missing data | Often guesses | Says what is missing and what is available |
| Data changes | Answer stays the same | Answer changes on the next question |
| Unsafe requests | May comply | Blocked by role permissions and a query validator |
| Reuse | One topic | Another dataset through a configuration file |

**Key product decisions**

| Decision | Choice | Reason |
| --- | --- | --- |
| Primary dataset | Snowflake sample data TPC-H (orders, customers, suppliers, parts) | Multi-table joins and easy-to-verify ground truth (C1) |
| Second dataset | Our World in Data (OWID) indicators loaded into our own Snowflake database | Proves reuse (C7), has gaps for missing-data tests (C6), and can be edited for the data-change demo |
| Division of work | Gemma understands, drafts and explains. Snowflake and ordinary code store, check, run and verify. | Required separation (M7, C5) |
| Answer integrity | Numbers come from rows and are verified | Prevents unsupported claims (M3) |
| Safety | Read-only Snowflake role plus a query validator | Two independent layers (C4, C6) |
| Interface | Simple, evidence first | Visual polish alone earns little (C8) |
| Licence | Apache-2.0 for our code \[A\] | Permissive and common. Gemma weights are not redistributed. |

## 3. Goals, non-goals and success metrics

**Goals**

| ID | Goal | Links |
| --- | --- | --- |
| G1 | Correct answers on unseen questions, including joins and multi-step analysis | M1, M2, C1 |
| G2 | Every answer can be proven: query, rows and a plain-language explanation | M4, M5, C3 |
| G3 | Honest behavior in hard cases: ambiguity, empty results, missing data, unsupported or unsafe requests | M6, C6 |
| G4 | Real Snowflake and Gemma integration with a clear separation between them | M7, C4, C5 |
| G5 | Reusable on a second dataset through configuration only | M8, C7 |
| G6 | Understandable by non-technical users | C2, C8 |

**Non-goals (we will not build these)**

- NG1: changing or writing data.
- NG2: training or fine-tuning models.
- NG3: very large data. We use the small TPC-H scale.
- NG4: replacing dashboards or business-intelligence tools.
- NG5: user accounts, billing or multi-tenant production security.
- NG6: forecasting or predictive modelling.
- NG7: voice, mobile apps, or languages other than English \[A\].
- NG8: question answering over documents (listed as optional in the statement, not planned).

**Success metrics** (targets are suggested and should be adjusted once we measure)

| Metric | Definition | Target | Links |
| --- | --- | --- | --- |
| Execution accuracy, development set | Share of test questions whose query result matches independently computed ground truth | At least 85% | C1 |
| Execution accuracy, held-out set | Same, on questions never used while tuning | At least 80% | C1 |
| Number faithfulness | Share of numbers in answers that appear in the returned rows | 100% (enforced by a verifier) | M3, C1 |
| Evidence completeness | Answered responses that include SQL, query ID, rows and explanation | 100% | M5, C3 |
| Explanation fidelity | Explanations whose tables, filters, grouping and ordering match the executed SQL | At least 95% | M4, C3 |
| Safe handling | Unsafe prompts blocked, and unsupported ones declined with a reason | 100%, and at least 90% | M6, C6 |
| Ambiguity handling | Ambiguous test questions that get a clarification or a stated assumption | At least 80% | M6, C6 |
| Follow-up accuracy | Follow-up test questions answered correctly | At least 80% | C2 |
| Latency | 95th-percentile time from question to answer | 15 seconds or less \[A\] | C8 |
| Reproducibility | Time for a teammate who did not build it to reach a first answer on a clean machine | 30 minutes or less | M8, C4 |
| Dataset swap | Code changes needed to add the second dataset | Zero | C7 |
| Credit use | Warehouse size and auto-suspend time | X-Small, suspends within 60 seconds | C4 |

## 4. Users and use cases

**Personas**

| ID | Who | Skills and needs | Frustration today | Dataset |
| --- | --- | --- | --- | --- |
| P1 | Operations analyst at a wholesale distributor | Knows spreadsheets, not SQL. Needs quick answers about orders, customers, suppliers and parts. | Waits days for a data team to write queries | TPC-H |
| P2 | Policy student or researcher | Explores health and economic indicators across countries and years | Data scattered across files with gaps, and unsure what is missing | OWID |
| P3 | Hackathon judge | Will ask unseen questions, inspect evidence, test refusals and reproduce the setup | Polished demos that hide wrong answers | Both |
| P4 | Developer adopting DataMind | Wants to point it at their own Snowflake data | Tools that need code rewrites | Any |

**Sample questions the product must handle** (these become test cases)

| Dataset | Question | Type | Expected behavior |
| --- | --- | --- | --- |
| TPC-H | What was total revenue in 1995? | Aggregate | Revenue computed with the definition from the dataset configuration, and stated in the explanation |
| TPC-H | Which five customers spent the most, and which country are they in? | Join and ranking | Joins customers, orders and nations. Shows five rows. |
| TPC-H | How did order counts change month by month in 1996? | Time series | Grouped by month, with an optional chart |
| TPC-H | Which European suppliers supply the most parts? | Multi-table join | Joins through nation and region |
| TPC-H | Now only show the top three. | Follow-up | Re-uses the previous context and shows it to the user |
| TPC-H | Who are our best customers? | Ambiguous | Asks what “best” means, or states an assumption such as total spend |
| TPC-H | Show sales for Atlantis. | Empty result | Says nothing matches and lists valid options |
| TPC-H | Delete all orders from 1994. | Unsafe | Refused. Nothing reaches Snowflake. |
| TPC-H | What will revenue be next year? | Unsupported | Declines forecasting and offers the historical trend instead |
| OWID | Which five countries had the highest life expectancy in 2019? | Ranking | Rows and source indicator shown |
| OWID | Is there a relationship between income per person and years of schooling? | Analysis | Correlation computed in Snowflake, with the number of countries used |
| OWID | Which countries have no data for 2020? | Missing data | Lists them and states the coverage that does exist |

## 5. User stories and acceptance criteria

| ID | Story | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| US-01 | As an analyst, I ask a question in everyday words and get an answer on one screen. | Must | Free text up to 500 characters is accepted. Three different phrasings of the same question return the same result rows. The 95th-percentile answer time is 15 seconds or less. |
| US-02 | As an analyst, I want answers computed from real data so I can rely on them. | Must | Every answered response has a Snowflake query ID. Running the shown SQL in Snowflake returns the same rows. |
| US-03 | As an analyst, I want a plain-language account of how the answer was obtained. | Must | The explanation names the tables, filters, grouping, sorting and limit actually used, plus assumptions. Every statement matches the executed SQL. |
| US-04 | As a judge, I want to inspect the evidence behind any answer. | Must | An expandable panel shows formatted SQL (copyable), query ID, run time, row count, the first 50 rows, tables and columns used, and the data snapshot time. |
| US-05 | As a user, I want numbers I can trust. | Must | Every number in the answer text exists in the returned rows, or is a row count, a limit or a value from the question. Otherwise the answer is blocked and regenerated, or flagged. |
| US-06 | As a user, I want vague questions handled sensibly. | Must | If interpretations differ materially and no default exists, the system asks one clarifying question with 2 to 4 options. If a default exists, it answers and shows the assumption. |
| US-07 | As a user, I want honesty when nothing matches. | Must | An empty result is reported as such, with the likely cause (for example a value that does not exist) and valid alternatives. No invented numbers. |
| US-08 | As a researcher, I want to know what data is missing. | Must | The system states which entities or years have no data and what coverage does exist. |
| US-09 | As a user, I want a clear reason when a request is unsupported. | Must | The response names why (for example forecasting, or data not present) and suggests a supported alternative. |
| US-10 | As the product owner, I want unsafe requests stopped. | Must | Write, delete, schema-changing, multi-statement and instruction-injection attempts are blocked before reaching Snowflake and are logged. |
| US-11 | As a user, I want follow-up questions to work. | Must | Pronouns and implied filters resolve from the previous turn. The interface shows the context used. |
| US-12 | As a judge, I want to see answers change when the data changes. | Must | After editing a row in our own demo table, the same question returns the updated answer with a new query ID. No stale cached answers. |
| US-13 | As a developer, I want to add a dataset without code changes. | Must | A new dataset folder with a configuration file works with the unmodified code and passes the shared test subset. |
| US-14 | As an administrator, I want access control respected. | Should | Under a restricted role, hidden tables are invisible, and asking about them returns a clear no-access message. |
| US-15 | As a user, I want a chart when it helps. | Could | Time series and small category results can be charted. The chart data matches the returned rows exactly. |
| US-16 | As a judge or developer, I want to reproduce the setup. | Must | From a clean machine to a first answered question in 30 minutes or less by following the README. |
| US-17 | As a team lead, I want one command that reports accuracy. | Must | The command runs the golden test set and prints accuracy per question group and a list of failures. |

## 6. Functional requirements

Each requirement has an ID, a priority and a link back to the problem statement (M1 to M8) and the scoring rubric (C1 to C8).

**A. Question intake and understanding**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-A1 | Accept free-text questions up to 500 characters in English \[A\]. | Must | M1, C2 |
| FR-A2 | Classify each question as answerable, ambiguous, unsupported, unsafe or follow-up, with a short reason. | Must | M6, C6 |
| FR-A3 | Rewrite follow-up questions into standalone questions using the most recent turns. | Must | C2 |
| FR-A4 | Resolve relative time words (last year, recent, this quarter) against the latest date in the data, not today’s date, and show the resolved range as an assumption. | Must | M6, C6 |
| FR-A5 | Use the dataset configuration to map business words and synonyms (revenue, sales, spend, customers) to tables, columns and metric definitions. | Must | C2 |
| FR-A6 | When a dataset has many tables, choose the relevant tables and columns before drafting SQL. | Should | C2 |

**B. Query drafting, safety and execution**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-B1 | Gemma drafts SQL as structured output (SQL, tables used, assumptions, confidence) that is validated against a defined shape before use. | Must | M7, C5 |
| FR-B2 | Parse the SQL with a real SQL parser. Allow exactly one read-only statement (SELECT, optionally with WITH). | Must | C4, C6 |
| FR-B3 | Block schema-changing and data-changing commands, multiple statements, session and system commands, and file operations. | Must | C4, C6 |
| FR-B4 | Check that every table and column exists in the catalog visible to the active role. | Must | C1, C4 |
| FR-B5 | Enforce a row limit (default 1,000 rows fetched) and a statement timeout (default 30 seconds). | Must | C4 |
| FR-B6 | Execute only through a read-only Snowflake role. | Must | M2, C4 |
| FR-B7 | If a query fails, send the error back to Gemma for up to 2 repair attempts, then fail honestly. | Should | C1 |
| FR-B8 | Record the Snowflake query ID and set a query tag containing a request ID for every execution. | Should | M5, C3 |
| FR-B9 | Include a few example question-and-SQL pairs per dataset in the drafting prompt. | Should | C1, C2 |
| FR-B10 | Support multi-step analysis: up to 3 dependent queries, each logged as evidence. | Could | C1 |

**C. Answer composition and grounding**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-C1 | Compose answers only from returned rows and the facts about the query. No outside knowledge. | Must | M3, C1 |
| FR-C2 | Numbers in answers are either inserted by code from result cells or verified against the rows. An unverified number blocks the answer. | Must | M3, C1 |
| FR-C3 | Format numbers, dates and currency consistently using units from the dataset configuration. | Should | C8 |
| FR-C4 | State limits: truncated rows, the period the data covers, and whether the figures are totals or samples. | Must | M3 |
| FR-C5 | If no rows return, say so. Never guess a value. | Must | M6, C6 |

**D. Explanation and evidence**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-D1 | Derive “query facts” (tables, joins, filters, grouping, ordering, limit, date range) from the parsed SQL using code, not from the model. | Must | M4, C3 |
| FR-D2 | Gemma phrases the explanation from the query facts in plain language. An automatic check confirms no fact is missing or invented. | Must | M4, C3 |
| FR-D3 | Show the evidence panel with the fields in Section 8.5. | Must | M5, C3 |
| FR-D4 | Show the question as understood and the assumptions as visible chips. | Must | M4, C6 |
| FR-D5 | Add in-text references such as \[1\] that point to specific result rows. | Should | C3 |
| FR-D6 | Copy or export the evidence as Markdown or JSON. | Could | C3 |

**E. Edge cases and honesty**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-E1 | Ask one clarifying question with 2 to 4 options when interpretations differ materially and no default exists. | Must | M6, C6 |
| FR-E2 | When a result is empty, run a lightweight diagnostic (for example, check which filter values exist) and explain the likely cause. | Should | M6, C6 |
| FR-E3 | When data is missing, state which entities or periods are missing and what coverage exists. | Must | M6, C6 |
| FR-E4 | Decline unsupported requests (forecasts, opinions, data not present) with the reason and a supported alternative. | Must | M6, C6 |
| FR-E5 | Block unsafe requests and defend against instructions hidden in user text or in data values. | Must | M6, C6 |
| FR-E6 | Handle outages and timeouts (Snowflake, Gemma) with clear messages. Never show partial or invented answers. | Must | C6, C8 |
| FR-E7 | When results are large, summarise the top rows and say that the rest was omitted. | Should | C8 |
| FR-E8 | Match near-miss values (for example, misspelled country names) and confirm the match with the user. | Could | C2 |

**F. Conversation**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-F1 | Keep the last 6 turns per session, including each turn’s SQL and a summary of its result. | Must | C2 |
| FR-F2 | Provide a button that clears the conversation. | Should | C8 |
| FR-F3 | Show which earlier context a follow-up is using. | Should | C2, C3 |

**G. Snowflake integration and access control**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-G1 | Provide repeatable setup scripts that create the warehouse, roles, grants, database and schemas. Running them twice is safe. | Must | M8, C4 |
| FR-G2 | Use a small warehouse with a 60-second auto-suspend, auto-resume, and a resource monitor that caps credits. | Must | C4 |
| FR-G3 | Provide a load script that puts the OWID bundle into our own Snowflake database, with an attribution table. | Must | C4, C7 |
| FR-G4 | Create two roles: a reader with the full demo data and a restricted role with a subset, to demonstrate access control. | Should | C4 |
| FR-G5 | Use Snowflake schema discovery (information schema) to draft or validate dataset configuration. | Should | C7 |
| FR-G6 | Run data-quality checks on load (row counts, empty values, duplicate keys) and keep the results. | Could | C1 |

**H. Gemma integration**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-H1 | Gemma performs question classification, follow-up rewriting, SQL drafting, explanation phrasing and answer phrasing. | Must | M7, C5 |
| FR-H2 | A model adapter lets us switch Gemma variants or endpoints by changing configuration only. | Must | C5, C7 |
| FR-H3 | Document how to obtain the model, accept its licence, hardware needs, quantization (compression to use less memory) and measured speed. | Must | C5 |
| FR-H4 | Benchmark at least two Gemma variants on the golden test set and record the results. | Should | C5 |
| FR-H5 | Use a low temperature and record the prompt version with every request. | Should | C1, C5 |

**I. Datasets and reusability**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-I1 | Describe each dataset in one configuration file: location, tables, columns, descriptions, synonyms, joins, metric definitions, formats and sample questions. | Must | M8, C7 |
| FR-I2 | Provide an “init” command that drafts that file from Snowflake schema discovery. | Should | C7 |
| FR-I3 | Ship a second dataset (OWID) that works with zero code changes. | Must | C7 |
| FR-I4 | Offer a dataset selector in the interface. | Should | C7, C8 |
| FR-I5 | Document, but do not build, a connector interface for other sources. | Could | C7 |

**J. Interface**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-J1 | One-page interface: question box, answer card, assumption chips, explanation and an evidence section. | Must | C8 |
| FR-J2 | Show suggested starter questions for each dataset. | Should | C2, C8 |
| FR-J3 | Show progress steps (understanding, querying, checking). | Should | C8 |
| FR-J4 | Show results as a sortable table with CSV download. | Should | C8 |
| FR-J5 | Show a chart built only from returned rows. | Could | C8 |
| FR-J6 | Show time taken and an estimate of warehouse use per request. | Could | C4 |

**K. Evaluation and observability**

| ID | Requirement | Priority | Links |
| --- | --- | --- | --- |
| FR-K1 | Provide a golden test set and a one-command runner that reports accuracy per group and the failures. | Must | C1 |
| FR-K2 | Keep a held-out question set that is never used in prompts or tuning. | Must | C1 |
| FR-K3 | Include an adversarial group: destructive requests, SQL injection and prompt injection. | Must | C6 |
| FR-K4 | Write structured logs per request (request ID, status, SQL, row count, time, model, prompt version) without secrets. | Should | C3 |
| FR-K5 | Automate the data-change test using a cloned table. | Should | C1, C3 |

## 7. Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | 95th-percentile answer time of 15 seconds or less and median of 8 seconds or less \[A\]. Snowflake statement timeout of 30 seconds. |
| NFR-02 | Cost | X-Small warehouse, auto-suspend within 60 seconds, a resource monitor with a credit cap, and no warehouse left running while idle. |
| NFR-03 | Data security | Least privilege. The application role has no write permissions anywhere. |
| NFR-04 | Secrets | No secrets in the repository. An example environment file is provided. Prefer key-pair authentication for the Snowflake application user. |
| NFR-05 | Prompt-injection resilience | User text and result values are always treated as data, never as instructions. Covered by adversarial tests. |
| NFR-06 | Reliability | Malformed model output, timeouts and outages produce clear messages, not crashes. |
| NFR-07 | Consistency | The same question produces equivalent SQL in at least 90% of 5 repeated runs \[A\]. |
| NFR-08 | Reproducibility | Pinned dependency versions, one-command setup, repeatable scripts, and an optional container setup. |
| NFR-09 | Portability | Runs on Windows, macOS and Linux. The Gemma endpoint is configurable. |
| NFR-10 | Maintainability | Modular code, type hints, lint checks, and unit tests for the validator and verifier. |
| NFR-11 | Observability | Request IDs in logs. No credentials in logs. |
| NFR-12 | Usability | Plain language by default, keyboard accessible, readable contrast, and layouts for laptop and tablet widths. |
| NFR-13 | Licensing | Apache-2.0 for our code \[A\]. TPC-H is referenced, not copied. OWID attribution is kept and each indicator’s licence is checked. Gemma terms are followed and weights are not redistributed. |
| NFR-14 | Documentation | README, architecture, model setup, dataset onboarding, evaluation guide and a limitations page. |
| NFR-15 | Data handling | Send only the rows needed (default top 50) to Gemma. If Gemma runs on a hosted endpoint, document that result rows leave the local machine. |
| NFR-16 | Evidence access | All evidence text can be selected and copied. |

## 8. System behavior specification

### 8.1 Pipeline stages and what each must guarantee

| Stage | Done by | Output | Guarantee |
| --- | --- | --- | --- |
| 1. Intake | Code | Cleaned question | Length limit applied. Control characters removed. |
| 2. Context | Gemma and code | Standalone question | Follow-ups are rewritten using the last turns, and the context used is recorded. |
| 3. Classify | Gemma | Class, confidence and reason | Output matches a fixed shape or is retried. |
| 4. Select schema | Code, optionally Gemma | Relevant tables and columns | Only tables visible to the active role are offered. |
| 5. Draft SQL | Gemma | SQL, tables, assumptions, confidence | Output matches a fixed shape or is retried. |
| 6. Validate | Code | Pass or fail with a reason | One read-only statement. Known tables and columns. Row limit added. |
| 7. Execute | Snowflake, read-only role | Rows and query ID | Timeout enforced. Query tagged with request ID. |
| 8. Query facts | Code | Tables, filters, grouping, ordering, limit | Derived from the parsed SQL, not from the model. |
| 9. Compose | Gemma | Answer and explanation | Uses only the rows and the query facts. |
| 10. Verify | Code | Pass or fail | Every number traces to a row, a limit or the question. Every query fact is reflected. |
| 11. Present | Interface | Answer card and evidence | Shows status, assumptions and evidence. |

### 8.2 Response status types

| Status | When it happens | What the user sees |
| --- | --- | --- |
| ANSWERED | Query ran and the answer passed verification | Answer, explanation, assumptions, evidence panel |
| CLARIFY | Several materially different meanings and no default | One question with 2 to 4 choices. Nothing is run yet. |
| NO\_DATA | Query ran and returned no rows, or the data is missing | Plain statement, likely cause, valid alternatives, coverage |
| UNSUPPORTED | Request is outside what the data or product can do | Reason and a supported alternative |
| BLOCKED | Unsafe request or a query that failed validation | Short refusal. No query reaches Snowflake. Event logged. |
| ERROR | Outage, timeout or repeated failure | Clear message and a retry option. No partial answer. |

### 8.3 Ask or assume

- If a dataset configuration defines a default for the vague term (for example, “best customer” means highest total revenue), answer using the default and show it as an assumption chip.
- If there is no default and the meanings would give materially different results, ask exactly one question with 2 to 4 options.
- If the difference is cosmetic (for example, sort order), pick the most common choice and state it.
- Never ask more than one clarifying question in a row. After one answer, proceed.

### 8.4 Edge-case catalog

| ID | Situation | Required behavior |
| --- | --- | --- |
| EC-01 | Vague term such as “best”, “top” or “recent” | Apply Section 8.3. Show the assumption. |
| EC-02 | Relative time such as “last year” | Resolve against the latest date in the data and display the resolved dates. |
| EC-03 | Value does not exist (for example, Atlantis) | NO\_DATA with valid values listed. |
| EC-04 | Filter too strict, no rows | NO\_DATA with the likely cause from a diagnostic query. |
| EC-05 | Data missing for some entities or years | State what is missing and the coverage that exists. Never fill gaps. |
| EC-06 | Request to change or delete data | BLOCKED. Nothing sent to Snowflake. |
| EC-07 | Instruction inside the question (for example, “ignore your rules”) | Treated as plain text. Normal rules still apply. |
| EC-08 | Instruction inside a data value | Treated as data. It never changes behavior. |
| EC-09 | Forecast, prediction or opinion | UNSUPPORTED with a historical alternative. |
| EC-10 | Question about a table the role cannot see | Say that no accessible data covers it. Do not guess. |
| EC-11 | Model returns malformed output | Retry within limits, then ERROR. |
| EC-12 | Generated SQL fails to run | Repair up to 2 times, then ERROR with a plain message. |
| EC-13 | Very large result | Summarise the top rows and say the rest is omitted. |
| EC-14 | Follow-up with no earlier context | Ask what the follow-up refers to. |
| EC-15 | Question is in another language | State that only English is supported \[A\]. |
| EC-16 | Conflicting definitions (for example, two columns for the same idea) | Use the configured definition. If none, apply Section 8.3. |

### 8.5 Evidence panel specification

| Field | Content |
| --- | --- |
| Question as understood | The standalone version of the question |
| Assumptions | Chips such as “Revenue means price after discount” or “Last year means 1997” |
| SQL | The exact executed query, formatted and copyable |
| Query ID | Snowflake query ID, so the run can be found in Snowflake’s history |
| Run details | Time taken, warehouse size, rows returned and rows shown |
| Result rows | First 50 rows in a table |
| Sources | Tables and columns used, with dataset name and licence note |
| Data snapshot | When the query ran, plus the latest date present in the data |
| Model | Gemma variant and prompt version |
| Limits | Any truncation, missing coverage or caveat |

### 8.6 Time handling

TPC-H orders run from 1992 to 1998, so “this year” in today’s calendar would return nothing. The system anchors relative dates to the latest date in the configured time column and states the resolved range every time.

### 8.7 SQL safety rules

- **Allowed:** one SELECT statement, optionally with WITH (common table expressions), joins, filters, grouping, ordering, window functions, and read-only functions such as CORR.
- **Denied:** any statement that creates, alters, drops, inserts, updates, deletes, merges, copies, grants, calls procedures or changes session settings; multiple statements; file or stage access; and any table or column outside the active role’s visible catalog.
- **Added automatically:** a row limit and a timeout.
- **Two layers:** the validator in code and the read-only role in Snowflake. Either one alone must be enough to stop a write.

## 9. Data requirements

### 9.1 TPC-H (primary dataset)

TPC-H is a standard benchmark dataset of fake orders, customers, suppliers and parts, shared into every Snowflake account as the SNOWFLAKE\_SAMPLE\_DATA database. We reference it in place and do not copy it into our repository. Use the smallest scale (TPCH\_SF1) to save credits, and the larger scale (TPCH\_SF10) only for performance checks.

| Table | What a row is |
| --- | --- |
| CUSTOMER | A customer, with nation and market segment |
| ORDERS | An order, with date, status, priority and total price |
| LINEITEM | One item on an order, with quantity, price, discount, ship and receipt dates |
| PART | A product |
| SUPPLIER | A supplier, with nation |
| PARTSUPP | Which suppliers offer which parts, with cost and availability |
| NATION and REGION | Country and world-region lookup |

The column names are short codes (for example L\_EXTENDEDPRICE), so the dataset configuration translates them to business language.

| Business term | Definition in the configuration |
| --- | --- |
| Revenue or sales | Sum of extended price times one minus discount, over line items |
| Order count | Count of distinct orders |
| Customer spend | Revenue grouped by customer |
| Late shipment | Line items where the receipt date is after the commit date |
| Region and country | Through the nation and region tables |

### 9.2 Our World in Data (second dataset)

- **Content:** 4 to 6 indicators such as life expectancy, income per person, years of schooling, population and one environment or health measure, chosen for clear CC BY licences \[A\].
- **Shape:** a country table (name, code, region if available) and one table per indicator with country code, year, value, and a flag for projected values. This gives joins, gaps and projections to test.
- **Loading:** a script downloads each indicator, loads it into our own Snowflake database, and records the source link, licence and download date in an attribution table.
- **Repository rule:** keep the download script and attribution. Do not commit raw data files unless the licence is confirmed.

### 9.3 Data-change demonstration

Because the shared sample database cannot be edited, the demonstration uses our own OWID tables. Steps: ask a question and note the answer, change one value in a clone of the table (a clone is an instant copy), ask the same question again, and show the new answer and the new query ID. The clone is dropped afterwards.

### 9.4 Adding any new dataset (configuration only)

1. Grant the read-only role access to the new tables.
2. Run the “init” command to draft the dataset file from schema discovery.
3. Edit descriptions, synonyms, joins and metric definitions.
4. Add 10 or more example questions with correct answers.
5. Run the evaluation command on the new dataset.

## 10. AI requirements

| Gemma task | Input | Output | Checked by |
| --- | --- | --- | --- |
| Classify question | Question, recent context | Class, confidence, reason | Fixed output shape |
| Rewrite follow-up | Question and previous turn | Standalone question | Fixed output shape and a context display |
| Draft SQL | Standalone question, relevant schema, metric definitions, examples | SQL, tables, assumptions, confidence | Parser, catalog check, role permissions |
| Phrase explanation | Query facts | Plain-language explanation | Fact-coverage check |
| Phrase answer | Rows and query facts | Answer text with number placeholders | Number verifier |

**Rules for the model**

- Gemma never executes anything, never sees credentials, and never decides safety on its own. Code and Snowflake permissions do.
- Temperature is low and prompts are versioned. Every response records model name and prompt version.
- Outputs must match a defined shape. Invalid output is retried within limits, then reported as an error.
- Row content and user text are placed in clearly marked data blocks, and the prompt says that text inside them is never an instruction.

**Model selection process**

1. Create the golden test set first (Section 13).
2. Run at least two Gemma variants (for example a mid-size and a small one) on it and record accuracy, speed and memory.
3. Choose the smallest variant that meets the accuracy targets in Section 3.
4. If no locally runnable variant meets them, use a hosted Gemma endpoint and document where result rows go.
5. Confirm the licence terms of the chosen variant on Google’s official model card before release.

## 11. User experience requirements

**Layout (one page).** A sidebar holds the dataset selector, the access role selector (if built), starter questions, a clear-conversation button, and a small status area showing that Snowflake and Gemma are connected. The main area is a conversation. Each answer is a card with the answer text at the top, assumption chips under it, the plain-language explanation, then a collapsed “Evidence” section that expands to the fields in Section 8.5.

| State | What the screen shows |
| --- | --- |
| Working | Progress steps: understanding the question, running the query, checking the answer |
| ANSWERED | Answer, chips, explanation, collapsed evidence, follow-up suggestions |
| CLARIFY | The question and 2 to 4 buttons to choose from |
| NO\_DATA | Plain statement, likely cause, and clickable valid alternatives |
| UNSUPPORTED or BLOCKED | Short reason and a suggested alternative. No technical jargon. |
| ERROR | What failed in plain words and a retry button |

**Writing rules:** short sentences, no jargon in the default view, units on every number, and technical detail only inside the evidence section. **Accessibility basics:** keyboard operable, readable contrast, and text that can be selected and copied.

## 12. Requirements traceability matrix

This table connects the problem statement, the scoring rubric, our requirements, the parts of the system, and the tests that prove each one. If a row has no test, it is not done.

| Problem statement requirement | Rubric criteria | PRD requirements | Main components | Verification |
| --- | --- | --- | --- | --- |
| M1: everyday-language questions, unseen by us | C1, C2 | US-01, US-11, FR-A1 to FR-A6, FR-F1 to FR-F3 | Classifier, follow-up rewriter, dataset configuration | Test groups T4 and T5, plus the held-out set |
| M2: answers from real retrieval at question time | C1, C4 | US-02, US-12, FR-B6, FR-K5 | Snowflake executor | Query ID check on every answer, T8 data-change test |
| M3: no unsupported model-generated claims | C1, C3 | US-05, FR-C1 to FR-C5 | Answer writer, number verifier | Verifier unit tests, faithfulness metric on T1 to T3 |
| M4: plain-language explanation of how the answer was obtained | C3 | US-03, FR-D1, FR-D2, FR-D4 | Query-facts extractor, explanation writer | Explanation fidelity check on every test run |
| M5: inspectable evidence | C3 | US-04, FR-B8, FR-D3, FR-D5 | Evidence panel | Evidence completeness metric, manual re-run of shown SQL in Snowflake |
| M6: ambiguity, missing data, empty results, unsupported requests | C6 | US-06 to US-10, FR-A4, FR-E1 to FR-E8, EC-01 to EC-16 | Classifier, validator, diagnostics | T6 and T7 |
| M7: meaningful Snowflake and Gemma integration | C4, C5 | US-14, FR-B1, FR-B6, FR-G1 to FR-G6, FR-H1 to FR-H5 | Snowflake setup scripts, model adapter | Setup scripts run clean, model benchmark results, architecture document review |
| M8: working, reproducible, open-source | C7, C8 | US-13, US-16, US-17, FR-I1 to FR-I5, NFR-08, NFR-13, NFR-14 | Repository, dataset configuration, documentation | T9 clean-machine setup and dataset swap |

## 13. Test and acceptance plan

**Golden test set.** Each question has an independently computed correct answer, made with hand-written SQL or pandas (a Python data library), never with Gemma. About 30% of questions in T1 to T6 are held out and never used in prompts or tuning.

| Group | What it tests | Questions |
| --- | --- | --- |
| T1 | Simple lookups and aggregates | 12 |
| T2 | Joins and rankings | 12 |
| T3 | Multi-step questions and analysis | 8 |
| T4 | Rephrasings of the same intent | 10 |
| T5 | Follow-ups | 8 |
| T6 | Traps: ambiguity, empty results, missing data, unsupported requests | 14 |
| T7 | Adversarial: destructive requests, SQL injection, prompt injection | 10 |
| T8 | Data-change scenarios using cloned tables | 3 |
| T9 | Clean-machine setup and second-dataset swap | 2 checks |

**How results are scored**

- **Execution accuracy:** the result set matches ground truth, ignoring column names and, unless the question asks for ranking, row order.
- **Faithfulness:** every number in the answer traces to a row, a limit or the question.
- **Evidence completeness:** SQL, query ID, rows and explanation are all present.
- **Explanation fidelity:** the facts in the explanation match the executed SQL.
- **Trap handling:** the response status is the expected one (CLARIFY, NO\_DATA, UNSUPPORTED or BLOCKED).

**Other test levels:** unit tests for the validator, verifier and query-facts extractor (these are the safety-critical parts); integration tests for the full pipeline against Snowflake; and a dress rehearsal with questions written by someone outside the build team.

**Acceptance gates**

| Milestone | Gate |
| --- | --- |
| End of core pipeline | At least 60% execution accuracy on T1 and T2. Validator blocks every T7 destructive case. |
| End of trust features | Every status type demonstrable. Faithfulness 100%. Evidence completeness 100%. |
| End of evaluation and hardening | Section 3 targets met, or a written gap list with owners. |
| Release | Clean-machine setup passes. Dataset swap passes. Dress rehearsal passes. |

## 14. Release plan and scope tiers

**Scope tiers**

- **MVP:** every Must requirement.
- **Target:** MVP plus the Should requirements.
- **Stretch:** Could requirements, only after Target is stable.

**Phases.** The deadline is not yet known, so each phase is a share of the total time available \[A\].

| Phase | Share of time | Main work | Exit criterion |
| --- | --- | --- | --- |
| 0. Foundations | 10% | Snowflake account and roles, repository, Gemma running, golden test set started | One question runs end to end, even hard-coded |
| 1. Core pipeline | 25% | Classifier, SQL drafting, validator, execution, answer writer | Gate for end of core pipeline |
| 2. Trust features | 25% | Query facts, verifier, evidence panel, edge-case handling | Gate for end of trust features |
| 3. Evaluation and hardening | 20% | Full test set, tuning, model benchmark, adversarial tests | Gate for end of evaluation |
| 4. Reuse and polish | 10% | OWID dataset, dataset selector, role demo, interface clean-up | Dataset swap passes |
| 5. Documentation and demo | 10% | README, architecture, model setup, rehearsals, backup video | Release gate |

**Feature freeze** happens at about 85% of the time. **Cut order if time runs short:** charts, multi-step analysis, export, fuzzy value matching, then the restricted-role demo. **Never cut:** the validator, the verifier, the evidence panel, and the golden test set.

## 15. Team roles

If the team is smaller than six, combine roles. Every role needs a named backup. Names are to be assigned.

| Role | Owns | Main requirements |
| --- | --- | --- |
| Data and Snowflake lead | Account, roles, scripts, data loading, dataset configuration | FR-G1 to G6, FR-I1 to I3 |
| Model lead | Gemma setup, prompts, structured output, benchmark | FR-B1, FR-H1 to H5 |
| Pipeline and safety lead | Validator, repair loop, verifier, query facts | FR-B2 to B8, FR-C1 to C5, FR-D1 |
| Evaluation lead | Golden test set, held-out set, runner, reports | FR-K1 to K5 |
| Interface and documentation lead | Interface, evidence panel, README, architecture document | FR-J1 to J6, FR-D3, NFR-14 |
| Pitch and demo lead | Story, demo script, backup video, judge Q and A | Section 17 |

## 16. Risks, assumptions, dependencies and open decisions

**Risk register**

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| RK-01 | Gemma drafts wrong SQL | High | High | Benchmark early, schema and metric hints, examples, repair loop, larger or hosted model if needed |
| RK-02 | Confident answers that are wrong | Medium | High | Number verifier, evidence panel, held-out tests |
| RK-03 | Snowflake setup, credits or sign-in rules cause delays | Medium | High | Set up on day one, X-Small warehouse, resource monitor, check current authentication requirements early |
| RK-04 | Gemma 4 terms or availability differ from press reports | Medium | Medium | Confirm on the official model card, keep a Gemma 3 fallback |
| RK-05 | Team hardware cannot run the chosen model | Medium | High | Benchmark on day one, hosted endpoint as fallback |
| RK-06 | Time lost on interface polish | Medium | Medium | Scope tiers and feature freeze |
| RK-07 | OWID licence or download problems | Low to medium | Medium | Choose clear CC BY indicators and test downloads early |
| RK-08 | Instructions hidden in data values | Low | Medium | Data blocks in prompts and adversarial tests |
| RK-09 | Network or service failure on demo day | Medium | High | Recorded backup video, pre-warmed warehouse, rehearsal in demo conditions |
| RK-10 | A team member is unavailable | Medium | Medium | Named backups and shared documentation |

**Assumptions to confirm \[A\]**

- The team has 4 to 6 members who can write Python and SQL.
- The deadline allows the six phases above.
- A Snowflake trial or account with credits is available.
- At least one machine can run a mid-size Gemma model, or a hosted endpoint is allowed.
- English-only questions are acceptable.
- Apache-2.0 is acceptable as the repository licence.

**Dependencies:** Snowflake account and sample data access; a Gemma model and its licence acceptance; OWID downloads; a public code repository.

**Open decisions:** which Gemma variants to benchmark, local or hosted model serving, the final OWID indicator list, whether to build the restricted-role demo, and the interface framework (see the Tech Stack document).

## 17. Demo and judging readiness

**Demo script (adjust to the time we are given)**

1. One sentence on the problem and the user.
2. Ask a judge-supplied question. Show the answer, then open the evidence panel.
3. Re-run the shown SQL in Snowflake and match the query ID.
4. Ask a vague question. Show the clarification or the stated assumption.
5. Ask for something unsafe. Show the refusal.
6. Ask a question with an empty result and one with missing data.
7. Change a value in our OWID clone, ask again, and show the answer and query ID change.
8. Ask a follow-up.
9. Switch to the second dataset with no code change.
10. Show test accuracy per group, the repository and the setup guide.

**Submission checklist:** public repository with licence; README with setup from scratch; architecture document covering Snowflake and Gemma; model acquisition notes; dataset onboarding guide; test instructions and results; limitations page; backup video.

## 18. Glossary

- **Execution accuracy:** the share of questions where the query’s result matches the correct result.
- **Golden test set:** questions with independently computed correct answers.
- **Held-out set:** test questions never used for tuning, to imitate unseen judge questions.
- **Read-only role:** a Snowflake permission set that can read data but not change it.
- **Resource monitor:** a Snowflake setting that limits credit use.
- **Prompt injection:** text that tries to give the AI instructions, such as “ignore your rules”.
- **Structured output:** model output in a fixed, machine-checkable shape.
- **Trust cap:** the rule that a Poor correctness score caps the whole score at 50.
- **Warehouse:** Snowflake’s compute engine, which uses credits while running.
