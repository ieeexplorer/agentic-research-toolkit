# Contributing Guide

This repository is intentionally designed so multiple contributors can create their own branches and be compared fairly.

## Branch Naming

Use clear branch names that show who/what the work is for.

| Branch Type | Example | Purpose |
|---|---|---|
| Candidate solution | `candidate/your-name-agent-core` | Full proposed implementation for comparison |
| Feature | `feature/tool-registry` | One focused feature |
| Research | `research/rag-evaluation-methods` | Experimental research/prototype work |
| Docs | `docs/architecture-notes` | Documentation-only work |
| Hotfix | `hotfix/fix-import-error` | Small urgent correction |

## Rules

1. Do not commit directly to `main` unless it is repository setup or governance.
2. Each contributor should create their own `candidate/*` branch for comparison.
3. Keep code runnable and documented.
4. Add tests for core behaviour.
5. Open a pull request when ready so branches can be compared side by side.

## Suggested Comparison Criteria

| Criteria | What to Check |
|---|---|
| Architecture | Is the design modular and easy to extend? |
| Code Quality | Is the code clean, typed, and readable? |
| Tests | Are important behaviours tested? |
| Documentation | Can a new person understand it quickly? |
| Practical Value | Does it solve real research-agent problems? |
| Future Ready | Can it support MCP, RAG, cloud, and evaluation later? |
