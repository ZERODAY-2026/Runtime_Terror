# PS1 — DataMind: Talk to Your Data

## Problem Statement

**The challenge.** Organizations hold large amounts of information in databases, spreadsheets, documents and other sources. Getting a useful answer often takes technical skills, specialised queries or hours of manual searching, so the people who understand the questions best are often the least able to reach the data.

**Our mission.** Create an AI-powered data experience that lets people ask questions in everyday language and get useful answers grounded in the available data, with enough explanation that users trust the response reflects the information actually examined.

**Goal.** The goal is not fluent text. The system must meaningfully work with data (retrieve, query, analyse) and make its answers understandable and trustworthy. Think broadly about data types, industries and users: business intelligence, operations, research, education, finance and decision-making are all fair game. Unlike a chatbot that produces plausible text, a data agent computes answers from the real data, shows the query, rows or sources, flags gaps, and changes its answer when the data changes.

---

# DataMind

Ask questions about your Snowflake data in everyday language and get answers that show their work:
the exact SQL that ran, the Snowflake query ID, the result rows, and a plain-language explanation.
Google Gemma understands the question and drafts SQL; ordinary code checks it; Snowflake runs it
under a read-only role.

> Status: **phase 0 (foundations)**. The pipeline runs end to end with a scripted model on an
> offline fixture. Snowflake and Gemma connections are written but not yet tested against live
> services. See [Build status](#build-status).

## How a question is answered

```
question -> Gemma drafts SQL (structured output) -> validator (sqlglot, read-only, known
tables/columns, row limit) -> Snowflake (read-only role, timeout, query tag) -> answer built from
result rows -> evidence: SQL, query ID, rows, tables
```

Gemma never runs anything and never decides safety. Two independent layers stop writes: the
validator in code and the read-only `DATAMIND_READER` role in Snowflake.

## Quick start

Requirements: Python 3.11+, a Snowflake account, and a Gemma model served by
[Ollama](https://ollama.com) (local or remote).

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev,ui]"
cp .env.example .env               # then fill it in; never commit .env
```

### 1. Snowflake

Run the scripts in `snowflake/` in order, in Snowsight or SnowSQL. Each is safe to run twice.

| Script | Run as | Creates |
| --- | --- | --- |
| `00_account_setup.sql` | ACCOUNTADMIN | X-Small warehouse `DATAMIND_WH` (60 s auto-suspend), resource monitor, `DATAMIND_DB` |
| `01_roles_and_grants.sql` | ACCOUNTADMIN | Roles `DATAMIND_READER`, `DATAMIND_LOADER`, `DATAMIND_RESTRICTED`; user `DATAMIND_APP` |
| `02_owid_schema.sql` | DATAMIND_LOADER | OWID tables (filled in phase 4) |

Create a key pair for the application user and register the public key:

```bash
mkdir -p keys
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out keys/datamind_app_rsa_key.p8 -nocrypt
openssl rsa -in keys/datamind_app_rsa_key.p8 -pubout -out keys/datamind_app_rsa_key.pub
# In Snowflake: ALTER USER DATAMIND_APP SET RSA_PUBLIC_KEY = '<body of the .pub file>'
```

## Documentation

- [Product Requirements Document (PRD)](./DataMind%20Product%20Requirements%20Document%20(PRD).md)
- [Tech Stack and Engineering Guide](./DataMind%20Tech%20Stack%20and%20Engineering%20Guide.md)

