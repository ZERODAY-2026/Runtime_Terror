# DataMind: Tech Stack and Engineering Guide

*Version 1.0, draft for team review, 18 October 2026. Companion to the DataMind PRD. Requirement IDs such as FR-B2 or NFR-04 point to the PRD. Items marked \[A\] are assumptions or choices the team should confirm. Technical terms are explained where they first appear, and a glossary is at the end.*

## 1. Purpose and summary of decisions

This document says which technologies we use to build DataMind, why we chose them, what we rejected, how the pieces fit together, and how to set everything up. Where a choice depends on facts we do not have yet (team skills, hardware, deadline), the document gives a default and a rule for changing it.

**The seven decisions that matter most**

1. **Python 3.11 or newer** for everything except the Snowflake setup scripts (SQL). One language keeps the team productive.
2. **Snowflake through its official Python connector.** Plain SQL, a dedicated read-only role, a small warehouse, and setup scripts that anyone can re-run.
3. **Gemma behind a model adapter.** The code talks to a standard chat interface, so we can switch between Gemma variants, or between local and hosted serving, by changing configuration. We choose the smallest variant that meets our accuracy targets on our own test set.
4. **A plain Python pipeline, not an agent framework.** Every step is a small function we can test and explain. This makes traceability (rubric C3) much easier.
5. **A real SQL parser (sqlglot) for safety and for explanations.** It validates every query and also extracts the facts used to explain the query, so explanations match what actually ran.
6. **A number verifier.** Numbers in answers come from result cells or are checked against them.
7. **Test first.** A golden test set with independently computed answers drives every decision, because a weak correctness score caps the whole project at 50 out of 100.

## 2. Stack at a glance

| Layer | Default choice | Why | Main alternative |
| --- | --- | --- | --- |
| Language | Python 3.11 or newer | Best libraries for Snowflake, models and testing | None needed |
| Data platform | Snowflake (required) | Required by the statement | None |
| Database access | snowflake-connector-python | Official, simple, exposes query IDs | Snowpark (extra complexity) |
| AI model | Google Gemma (required), variant chosen by benchmark | Required by the statement | Another Gemma size |
| Model serving | Ollama locally. Hosted Gemma endpoint as fallback. | Simplest local setup with a standard chat interface | Hugging Face Transformers, vLLM, llama.cpp |
| Model client | Thin adapter using HTTP to a standard chat endpoint | Swap models by configuration | Provider SDKs |
| Output checking | Pydantic v2 | Defines and validates the shape of model output | Hand-written checks |
| SQL safety and facts | sqlglot with the Snowflake dialect | Real parsing instead of text matching | sqlparse (weaker) |
| Dataset configuration | YAML files read with PyYAML and checked with Pydantic | Readable by non-programmers, supports configuration-only reuse | JSON, dbt |
| Pipeline control | Plain Python modules | Transparent and testable | LangGraph, LangChain, LlamaIndex |
| Interface | Streamlit | Fast, Python only, good for demos | Gradio, or React with FastAPI |
| Charts | Plotly | Works well inside Streamlit | Altair |
| Optional API | FastAPI with Uvicorn | Standard, typed, automatic docs | None |
| Testing | pytest plus our own evaluation runner | Standard | None |
| Code quality | ruff (lint and format), pre-commit | Fast, little setup | flake8, black |
| Packaging | pyproject.toml, uv or pip, optional Docker Compose | Reproducible installs | Poetry |
| Version control and CI | Git, GitHub, GitHub Actions | Free and familiar | GitLab |
| Logging | Python logging with structlog \[A\] | Structured logs with request IDs | Plain logging |

## 3. Architecture

One question travels through these steps. Boxes marked **Gemma** use the AI model. All others are ordinary code or Snowflake.

**Question, then context rewrite (Gemma), then classify (Gemma), then schema selection, then SQL draft (Gemma), then validator, then Snowflake execution under a read-only role, then query-facts extractor, then answer and explanation writer (Gemma), then verifier, then interface with evidence panel.**

| Component | Responsibility | Uses Gemma | Related requirements |
| --- | --- | --- | --- |
| Config loader | Reads the dataset YAML and checks it | No | FR-I1 |
| Schema service | Reads tables and columns from Snowflake and intersects them with the active role’s visibility | No | FR-B4, FR-G5 |
| Context manager | Keeps recent turns, SQL and result summaries | No | FR-F1 |
| Question understanding | Rewrites follow-ups and classifies the question | Yes | FR-A2, FR-A3 |
| SQL generator | Drafts SQL as structured output | Yes | FR-B1 |
| Validator | Parses SQL and enforces the safety rules | No | FR-B2 to FR-B5 |
| Executor | Runs the query with the read-only role and records the query ID | No | FR-B6, FR-B8 |
| Query-facts extractor | Reads tables, filters, grouping and ordering from the parsed SQL | No | FR-D1 |
| Composer | Writes the answer and explanation from rows and facts | Yes | FR-C1, FR-D2 |
| Verifier | Checks numbers and facts | No | FR-C2, FR-D2 |
| Presenter | Builds the evidence panel and the interface | No | FR-D3, FR-J1 |

**Rule:** Gemma never runs anything and never decides safety on its own. Code and Snowflake permissions do.

## 4. Layer-by-layer decisions

### 4.1 Language and tooling

Use Python 3.11 or newer. Manage dependencies with a pyproject.toml file (the standard Python project description) and install with uv (a fast installer) or plain pip. Pin exact versions so a stranger gets the same result. Use ruff for style checks and pre-commit (a tool that runs checks before each commit) so the repository stays clean.

### 4.2 Snowflake

**Account.** Create a Snowflake account early, using a free trial if allowed. Check current trial terms and credit amounts on Snowflake’s site, because organizers do not provide accounts.

**Compute and cost control.** A warehouse is Snowflake’s compute engine, and it uses credits while running. Use size X-Small (about 1 credit per hour while running), auto-suspend after 60 seconds, auto-resume, and a resource monitor (a credit cap that notifies or suspends). Resource monitors are created by an account administrator.

**Roles and least privilege.** A role is a bundle of permissions. We use separate roles:

- DATAMIND\_LOADER: can create and load tables in our own database. Used only by the load script.
- DATAMIND\_READER: can only read. The application always uses this role (FR-B6, NFR-03).
- DATAMIND\_RESTRICTED: can read only a subset, for the access-control demo (FR-G4).

**Authentication.** For the application user, prefer key-pair authentication (a private key file instead of a password). Snowflake has been tightening single-password sign-ins, so check the current requirements before you start \[A\].

Example setup script (shortened). Real scripts live in the snowflake folder and must be safe to run twice.

```
USE ROLE ACCOUNTADMIN;
CREATE WAREHOUSE IF NOT EXISTS DATAMIND_WH
  WAREHOUSE_SIZE = XSMALL AUTO_SUSPEND = 60 AUTO_RESUME = TRUE INITIALLY_SUSPENDED = TRUE;
CREATE ROLE IF NOT EXISTS DATAMIND_READER;
CREATE ROLE IF NOT EXISTS DATAMIND_LOADER;
GRANT USAGE ON WAREHOUSE DATAMIND_WH TO ROLE DATAMIND_READER;
GRANT USAGE ON WAREHOUSE DATAMIND_WH TO ROLE DATAMIND_LOADER;
-- Read access to the shared TPC-H sample data
GRANT IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE_SAMPLE_DATA TO ROLE DATAMIND_READER;
-- Our own database for the OWID tables
CREATE DATABASE IF NOT EXISTS DATAMIND_DB;
CREATE SCHEMA IF NOT EXISTS DATAMIND_DB.OWID;
GRANT ALL ON SCHEMA DATAMIND_DB.OWID TO ROLE DATAMIND_LOADER;
GRANT USAGE ON DATABASE DATAMIND_DB TO ROLE DATAMIND_READER;
GRANT USAGE ON SCHEMA DATAMIND_DB.OWID TO ROLE DATAMIND_READER;
GRANT SELECT ON ALL TABLES IN SCHEMA DATAMIND_DB.OWID TO ROLE DATAMIND_READER;
GRANT SELECT ON FUTURE TABLES IN SCHEMA DATAMIND_DB.OWID TO ROLE DATAMIND_READER;
-- Per-request safeguards are set from code: STATEMENT_TIMEOUT_IN_SECONDS and QUERY_TAG
```

**Session settings from code.** At connection time set STATEMENT\_TIMEOUT\_IN\_SECONDS (for example 30) and, per request, a QUERY\_TAG containing the request ID. The connector exposes each query’s ID, which we show in the evidence panel.

**Sample data.** TPC-H lives in SNOWFLAKE\_SAMPLE\_DATA. Use the TPCH\_SF1 schema (about 6 million line items) for development to save credits. If the sample database is missing in the account, follow Snowflake’s sample data documentation to add it.

### 4.3 Loading the OWID dataset

Use a Python script that downloads each chosen indicator, reshapes it into tidy tables (country, year, value, projected flag), and loads it into DATAMIND\_DB.OWID with the connector’s pandas helper (write\_pandas, which needs the pandas extra of the connector). The script also fills an attribution table with source link, licence and download date. Do not commit raw data unless the licence is confirmed \[A\].

For the data-change demonstration (FR-K5), use a zero-copy clone (Snowflake’s instant table copy): create a clone, change one value in the clone, ask the question against the clone, then drop it.

### 4.4 Gemma: choosing and serving the model

The statement allows any suitable Gemma variant. The variants named in it are Gemma 3n (E2B and E4B) and Gemma 4 (E2B, E4B, and reportedly 26B and 31B). Gemma 3 itself also exists in larger sizes (4B, 12B and 27B) and is a reasonable candidate. Confirm sizes and licence terms on Google’s official model card before committing, especially for Gemma 4, whose details in the statement come from press coverage.

| Candidate | Rough memory when compressed to 4 bits (approximate) | Expected role |
| --- | --- | --- |
| Gemma 3n E2B or E4B | Small, runs on ordinary laptops | Fast, lightweight option. Likely weakest at SQL. |
| Gemma 3 4B | About 3 GB | Fallback for weak hardware |
| Gemma 3 12B | About 8 GB | Likely best balance for a first baseline |
| Gemma 3 27B | About 17 GB | Higher accuracy if a strong GPU is available |
| Gemma 4 larger sizes | Check the model card | Test if available and the licence is clear |

Memory figures are rough and vary with the runtime and the amount of text the model reads at once. A graphics card (GPU) makes local use much faster. Without one, larger models can be too slow for a 15-second target.

**Selection rule.** Build the test set first. Run at least two variants on it. Pick the smallest variant that meets the accuracy targets in the PRD. If no local variant is good enough, use a hosted Gemma endpoint (for example through Google’s AI Studio or a rented GPU) and document that result rows then leave the local machine (NFR-15). Check availability and quotas first.

**Serving.** Ollama is the simplest local option. It downloads models with a single command, exposes a standard chat interface on the local machine, and supports constrained structured output. Model names look like gemma3:12b or gemma3n:e4b, so confirm exact names in its model library. Hugging Face Transformers, vLLM and llama.cpp are alternatives, and Gemma on Hugging Face is gated, so you must accept Google’s licence first.

**Model adapter.** One small module hides the details. Configuration holds the endpoint address, model name, temperature, timeout and maximum output length. The rest of the code calls one function and receives validated results. This satisfies FR-H2.

**Optional embeddings.** For choosing tables in large schemas (FR-A6), a small local embedding model (for example sentence-transformers, or Google’s EmbeddingGemma if available) can rank tables by similarity. For TPC-H a simple keyword match against the configuration is enough, so treat embeddings as optional.

### 4.5 The pipeline in detail

**Structured output.** Every Gemma call returns JSON that must match a Pydantic model (a typed definition of the expected fields). Where the server supports it, pass the shape to the server so output is constrained. If validation still fails, retry once with the error message, then report an error.

**Prompts.** Keep prompt templates as text files with version numbers, in their own folder. A SQL-drafting prompt contains the standalone question, only the relevant tables and columns with descriptions, metric definitions, a few examples, the Snowflake SQL dialect, and strict rules (one SELECT, use only listed columns). Row content and user text go inside clearly marked data blocks, with a rule that text inside them is never an instruction.

**Validator (sqlglot).** Steps:

1. Parse with the Snowflake dialect. Reject if parsing fails or if there is more than one statement.
2. Require a SELECT (a WITH clause is fine). Reject any other statement type.
3. Walk the parsed tree and collect every table and column. Reject anything not in the active role’s catalog.
4. Reject denied functions or commands (session changes, file access, procedure calls).
5. Add a row limit if absent, and cap an existing limit at our maximum.
6. Return the cleaned SQL, or a reason for rejection. The reason can be fed to the repair loop.

**Query facts.** From the same parsed tree, code collects tables, joins, filter conditions, grouping, ordering, limit and date range. Gemma is given these facts and asked to phrase them in plain language. A check then confirms that every fact appears in the explanation and that no extra tables, filters or numbers were mentioned. This is how we guarantee explanations match what actually ran (rubric C3).

**Number verifier and placeholders.** The answer writer does not type numbers freely. It writes placeholders such as the first row’s total revenue, and code replaces them with the real, formatted values. Any number left in the text must be a row count, a limit, a year or value from the question, or an exact match to a cell after formatting. A single unexplained number blocks the answer, which then goes to a rewrite or a flagged result.

**Repair loop.** If Snowflake reports an error, feed the error back to Gemma, up to 2 times (FR-B7). Then fail with a clear message.

**Clarification and empty results.** The classifier decides whether to ask or assume using the rules in PRD Section 8.3. For empty results, run one lightweight diagnostic query (for example, list valid values for the filtered column) before replying (FR-E2).

### 4.6 Dataset configuration (the reuse mechanism)

Each dataset has a folder with a dataset.yaml file and an examples.yaml file. Adding a dataset means adding a folder, never changing code (FR-I1, FR-I3).

```
dataset: tpch_sf1
display_name: Wholesale orders (TPC-H sample)
snowflake:
  database: SNOWFLAKE_SAMPLE_DATA
  schema: TPCH_SF1
  role: DATAMIND_READER
time:
  anchor_table: ORDERS
  anchor_column: O_ORDERDATE
defaults:
  best_customer_metric: revenue
metrics:
  revenue:
    description: Money earned from items after discount
    sql: SUM(L_EXTENDEDPRICE * (1 - L_DISCOUNT))
    synonyms: [sales, income, revenue]
tables:
  ORDERS:
    description: One row per customer order
    columns:
      O_ORDERDATE: {description: Date the order was placed, synonyms: [order date]}
      O_TOTALPRICE: {description: Total price of the order, unit: currency}
joins:
  - ORDERS.O_CUSTKEY = CUSTOMER.C_CUSTKEY
  - LINEITEM.L_ORDERKEY = ORDERS.O_ORDERKEY
```

An init command can draft this file by reading INFORMATION\_SCHEMA (Snowflake’s built-in catalog of tables and columns), and the team then adds descriptions and metrics (FR-I2).

### 4.7 Interface and optional API

**Streamlit is the default interface.** It needs only Python, has ready-made chat components and session memory, and fits a hackathon schedule. Build the core as an importable library first, then let Streamlit call it directly. A small FastAPI wrapper is optional, useful if a teammate prefers a React interface or if we want an API for judges. If the team has a strong front-end developer and spare time, React with FastAPI is a valid alternative \[A\].

Charts use Plotly and are drawn only from returned rows (FR-J5). Chart type is chosen by simple rules (time on the horizontal axis gives a line, categories give a bar), so the model cannot invent chart data.

### 4.8 Conversation memory and caching

- **Memory:** keep the last 6 turns per session in memory, each with the standalone question, SQL and a short result summary (FR-F1).
- **No answer caching.** The demo must show answers changing when data changes (US-12). Snowflake already reuses a query’s stored result only while the underlying data is unchanged, so we get speed without stale answers.
- **Safe to cache:** the dataset configuration and schema information (rebuilt when the file or schema changes). Caching model-drafted SQL by question, schema version and prompt version is optional, and the SQL is still re-run every time.

### 4.9 Testing and evaluation

| Test type | Tool | What it covers |
| --- | --- | --- |
| Unit tests | pytest | Validator, verifier, query-facts extractor, number formatting, configuration loader |
| Integration tests | pytest with a test Snowflake account or role | Full pipeline against real data |
| Evaluation runner | Our own script | Runs the golden set, compares results, prints accuracy per group and failures, saves a report |
| Adversarial tests | pytest | Destructive requests, SQL injection, prompt injection in questions and in data values |
| Data-change test | Evaluation runner with a cloned table | Changes a value and checks the answer changes |
| Clean-machine test | Fresh container or machine | Follows the README from scratch |

Ground truth is computed independently with hand-written SQL or pandas, never with Gemma. Compare result sets ignoring column names and, unless ranking is requested, row order. Keep a held-out split and never tune on it.

### 4.10 Observability

Each request gets a request ID. Log the request ID, status, SQL, row count, time per stage, model, prompt version and token counts. Never log credentials. Snowflake’s own query history can be matched to requests through the query tag. Credit usage can be checked in Snowflake’s account usage views (they can lag by hours) and is capped by the resource monitor.

### 4.11 Packaging and continuous integration

Provide a one-command setup, a pinned dependency list, an example environment file, and an optional Docker Compose file that starts the app (and optionally Ollama; GPU access through containers needs extra setup, so document the no-container path first). GitHub Actions runs lint and unit tests on every push. It does not need Snowflake credentials. Integration and evaluation runs are done locally by the team and reported in the repository.

## 5. Repository structure

```
datamind/
  README.md  LICENSE  NOTICE  pyproject.toml  .env.example  docker-compose.yml
  docs/
    architecture.md  model-setup.md  adding-a-dataset.md  evaluation.md  limitations.md
  datasets/
    tpch_sf1/        dataset.yaml  examples.yaml
    owid_indicators/ dataset.yaml  examples.yaml  download_and_load.py
  snowflake/
    00_account_setup.sql  01_roles_and_grants.sql  02_owid_schema.sql
  prompts/
    classify_v1.txt  rewrite_followup_v1.txt  draft_sql_v1.txt  explain_v1.txt  answer_v1.txt
  src/datamind/
    config/      model/      pipeline/      snowflake_io/      verify/      ui/      cli.py
  tests/
    unit/  integration/  adversarial/
  evaluation/
    golden/  heldout/  run_eval.py  reports/
```

## 6. Request and response contract

The core library and the optional API use the same shapes.

| Request field | Meaning |
| --- | --- |
| session\_id | Identifies the conversation |
| dataset | Which dataset configuration to use |
| role | Which Snowflake role to run as (reader or restricted) |
| question | The user’s text, up to 500 characters |

| Response field | Meaning |
| --- | --- |
| request\_id | Unique ID for logs |
| status | ANSWERED, CLARIFY, NO\_DATA, UNSUPPORTED, BLOCKED or ERROR |
| answer | Final text with verified numbers |
| explanation | Plain-language account built from query facts |
| assumptions | List of assumptions shown as chips |
| clarification | Question and options when status is CLARIFY |
| evidence | SQL, query ID, run time, rows returned, first 50 rows, tables and columns, data snapshot time, model and prompt version, limits |
| suggestions | Optional follow-up questions |

## 7. Setup guide (first day)

1. **Create the Snowflake account.** Sign up for a trial, note the account identifier, and create a user for the application with key-pair authentication.
2. **Run the setup scripts** in the snowflake folder using Snowsight (Snowflake’s web interface) or the command line.
3. **Install Python 3.11 or newer.** Create a virtual environment (an isolated set of packages) and install the project:

```
python -m venv .venv
# Windows: .venv\Scripts\activate   macOS or Linux: source .venv/bin/activate
pip install -e .
```

4. **Copy .env.example to .env** and fill in the Snowflake account, user, key path, role and warehouse. Never commit .env.
5. **Install Ollama** from its website, then pull a model and test it. Confirm the exact model name in Ollama’s library:

```
ollama pull gemma3:12b
ollama run gemma3:12b
```

6. **Accept the Gemma licence** on Hugging Face or Kaggle if you use those sources.
7. **Run a smoke test:** a script that connects to Snowflake, runs a trivial query on TPCH\_SF1, calls Gemma with a sample prompt, and prints both results.
8. **Load OWID** with the load script, then run the first evaluation on 5 hand-written questions.

## 8. Dependencies and their purpose

| Package | Purpose |
| --- | --- |
| snowflake-connector-python (with the pandas extra) | Connect to Snowflake, run queries, load data |
| sqlglot | Parse, validate and analyse SQL |
| pydantic | Define and validate structured data |
| pyyaml | Read dataset configuration |
| httpx | Call the model endpoint |
| pandas | Data loading and ground-truth checks |
| streamlit | Interface |
| plotly | Charts |
| fastapi and uvicorn (optional) | API |
| structlog (optional) | Structured logging |
| pytest, ruff, pre-commit | Testing and code quality |
| sentence-transformers (optional) | Table selection by similarity |

Pin exact versions in the project file, and prefer versions that have been out for a while.

## 9. Cost and performance budget

| Stage | Target time (suggested, to be measured) |
| --- | --- |
| Classify and rewrite | 1 to 2 seconds |
| SQL drafting | 3 to 6 seconds |
| Validation | Under 0.1 seconds |
| Snowflake execution on TPCH\_SF1 | 1 to 5 seconds, plus a few seconds if the warehouse must resume |
| Answer and explanation | 2 to 4 seconds |
| Verification | Under 0.1 seconds |

The total should stay within the 15-second target at the 95th percentile (NFR-01). Warm up the warehouse before a demo, and keep an X-Small warehouse unless tests show a real need.

## 10. Security checklist

- The application uses only the read-only role, and the validator blocks writes (two layers).
- No secrets in the repository. Keep .env out of version control.
- Prefer key-pair authentication and rotate keys after the event.
- User text and result values are data, never instructions.
- Logs contain no credentials.
- Send only the rows needed to Gemma (default top 50), and document where the model runs.
- Respect dataset licences (TPC-H referenced not copied, OWID attributed) and Gemma’s terms.

## 11. Alternatives considered

| Option | Why we are not using it by default |
| --- | --- |
| Snowflake Cortex Analyst and other Snowflake-hosted models | Optional in the statement, but models not from Gemma do not satisfy the Gemma requirement. Could serve as a comparison baseline only. |
| LangChain, LlamaIndex or LangGraph | Useful, but more moving parts and harder to explain step by step. Acceptable if the team already knows one. |
| Ready-made text-to-SQL libraries (for example Vanna) | Hide the steps we need to control and show. |
| Local files or DuckDB instead of Snowflake | Not allowed as the main data layer. Answers must come from Snowflake queries. |
| Fine-tuning Gemma on SQL | Out of scope (NG2), costly, and unnecessary if prompting with good schema context works. |
| Gradio | Good alternative to Streamlit. Choose whichever the team already knows. |

## 12. Stack risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Chosen Gemma variant is too slow or inaccurate locally | Day-one benchmark, smaller or larger variant, hosted endpoint |
| Constrained structured output behaves differently across servers | Keep Pydantic validation and a retry in all cases |
| Snowflake authentication rules change | Read the current documentation on day one |
| Parser rejects valid Snowflake SQL | Add tests for common patterns, and allow the repair loop to rewrite |
| Dependency or model download problems on demo day | Pin versions, pre-download models, keep a recorded backup video |
| Container setup fails on some machines | Document the plain Python path first |

## 13. Open decisions

- Team size and skills, which decide the interface choice and role split \[A\].
- Available hardware for local Gemma, and whether a hosted endpoint is allowed \[A\].
- Which Gemma variants to benchmark first.
- Final OWID indicator list and licence check.
- Whether to build the restricted-role demo and the optional API.

## 14. Glossary

- **Adapter:** a small module that hides differences between systems, so one can be replaced by another.
- **Clone (Snowflake):** an instant copy of a table that does not duplicate storage.
- **Constrained output:** forcing a model to produce text that fits a defined shape.
- **INFORMATION\_SCHEMA:** Snowflake’s built-in catalog describing tables and columns.
- **Key-pair authentication:** signing in with a private key file instead of a password.
- **Ollama:** a tool that downloads and runs open models on your own computer.
- **Pydantic:** a Python library for defining and checking data shapes.
- **Quantization:** compressing a model’s numbers so it uses less memory.
- **Resource monitor:** a Snowflake limit on credit use.
- **Semantic layer:** our configuration that explains tables, columns and business terms in everyday words.
- **sqlglot:** a Python library that parses SQL into a tree that code can inspect.
- **Virtual environment:** an isolated set of Python packages for one project.
