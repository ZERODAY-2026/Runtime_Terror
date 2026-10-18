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
