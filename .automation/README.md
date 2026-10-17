# Antigravity Report Automation System

## 1. Overview & Purpose of Phase A1
This directory contains the foundational specifications, schema, and templates for the **Antigravity Report Automation System** in the Personal Finance Super App.

The primary objective of Phase A1 is to establish a rigorous, standardized, machine-verifiable report schema and template. This ensures that:
- Task progress is factual, verifiable, and structured.
- Future automation components can reliably ingest and validate task outputs without manual reformatting.
- No application code, UI logic, business logic, or runtime dependencies are modified.

> **Status Notice:** Queues, watchers, daemons, and automated AI bridges are **NOT** implemented in this phase. Phase A1 defines the schema and guidelines only.

---

## 2. Directory Structure & Files Created

```
.automation/
├── README.md                           # Documentation and operational manual
├── schema/
│   └── report.schema.json              # Draft-07 JSON Schema for agent task reports
└── templates/
    └── task-report.template.json       # Validated starter template with explicit evidence markers
```

### File Purposes
- **`schema/report.schema.json`**: Formal JSON Schema (Draft-07) enforcing exact data types, enums, required keys, and ranges (0–100% progress, ISO 8601 timestamps, non-empty summaries).
- **`templates/task-report.template.json`**: An exemplar report demonstrating compliance with the schema, with placeholder values and explicit evidence classification (`[VERIFIED]`, `[AGENT-REPORTED]`, `[UNVERIFIED ASSUMPTION]`).
- **`README.md`**: Architectural reference, security rules, queue design, and operational procedures.

---

## 3. Report Fields & Allowed Values

Every generated report must include the following 15 top-level fields:

| Field Name | Type | Allowed Values / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `schema_version` | string | SemVer string (`1.0.0`) | Version of the report specification. |
| `task_id` | string | Non-empty string | Unique slug or identifier (e.g. `phase-2i-nav-fix`). |
| `phase` | string | Non-empty string | Human-readable phase title. |
| `task_status` | string | `SUCCESS`, `FAILURE`, `PARTIAL`, `BLOCKED` | High-level execution status. |
| `summary` | string | Non-empty string | Factual summary of changes and architectural decisions. |
| `changed_files` | array | Array of relative file paths | Exact files created, modified, or deleted. |
| `commands_run` | array | Array of `{ command, exit_code, stdout_summary? }` | Terminal verification commands executed. |
| `build_result` | string | `PASS`, `FAIL`, `SKIPPED` | Verification outcome of `npm run build`. |
| `test_results` | string | Non-empty string | Description of type-check, lint, or test outputs. |
| `errors` | array | Array of error strings (can be empty) | Blocking issues, runtime errors, or failures. |
| `risks` | array | Array of risk strings (can be empty) | Known regressions, edge cases, or dependencies. |
| `next_recommended_action` | string | Non-empty string | Recommended next task or phase for review. |
| `project_progress_percent` | number | Float between `0.0` and `100.0` | Weighted milestone progress estimate. |
| `verification_type` | string | `VERIFIED`, `INFERRED`, `NOT_VERIFIED` | Evidentiary backing of the findings. |
| `timestamp` | string | ISO 8601 date-time (`YYYY-MM-DDTHH:mm:ssZ`) | UTC timestamp of report completion. |

---

## 4. Planned Future Queue Architecture (Not Implemented Yet)

In future phases (Phase A2 and beyond), a lightweight local daemon will orchestrate reports and prompts through predictable file queues:

### Planned Report Queues
- `.automation/reports/pending/`: Newly generated agent reports waiting for validation and review.
- `.automation/reports/processed/`: Successfully validated and reviewed reports archived with run history.

### Planned Prompt Queues
- `.automation/prompts/pending_approval/`: Draft prompts produced by the AI reviewer, awaiting human review.
- `.automation/prompts/approved/`: Prompts explicitly approved by the human operator for execution.
- `.automation/prompts/rejected/`: Prompts rejected or modified by the human operator.

---

## 5. Mandatory Human Approval Requirement (Human-In-The-Loop)

- **Default Execution Policy:** Automated self-execution of AI-generated prompts is strictly prohibited.
- **Human Gate:** Every AI-generated next prompt must be reviewed and explicitly approved by the developer before submission to the Antigravity session.
- **No Unsupervised Loops:** The system must never loop autonomously without human confirmation at phase transitions.

---

## 6. Secret-Handling Rules & Data Safety

- **No Secrets in Reports:** Reports must never contain API keys (`sk-...`, tokens), passwords, personal financial records, bank details, or PII.
- **Sanitized Outputs:** Terminal command summaries must redact any sensitive environment variables or authorization headers.
- **Git Safety:** Dynamic runtime reports, prompt queues, and local configuration must remain gitignored (`.automation/reports/`, `.automation/prompts/`, `.automation/*.local.json`).

---

## 7. Emergency Stop Concept (Planned for Later Phase)

A manual kill switch mechanism will be integrated into the bridge runner:
1. **Sentinel File (`STOP`):** Placing an empty file named `STOP` or `EMERGENCY_STOP` in `.automation/` or the project root will immediately pause all bridge polling, queue processing, and outbound API calls.
2. **Signal Trapping:** Standard terminal interrupts (`Ctrl+C`, `SIGINT`, `SIGTERM`) will gracefully terminate any background process cleanly without corrupting queue state.
