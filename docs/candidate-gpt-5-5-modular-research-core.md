# Candidate Branch: GPT-5.5 Modular Research Core

Branch name:

```text
candidate/gpt-5-5-modular-research-core
```

## Strategy

This branch focuses on a clean, minimal, testable foundation before adding complex LLM, RAG, MCP, or cloud features.

The design choice is deliberate: build the stable skeleton first, then allow future branches to add advanced agent behaviours without creating a messy codebase.

## What This Candidate Adds

| Area | Added |
|---|---|
| Python package scaffold | `pyproject.toml`, `src/` layout |
| Agent abstraction | `Agent`, `AgentContext`, `AgentResult` |
| Baseline agent | `ResearcherAgent` |
| Orchestration | Sequential `ResearchWorkflow` |
| Tools | Simple `ToolRegistry` |
| Example | `examples/basic_research_workflow.py` |
| Tests | Agent, workflow, and registry tests |
| CI | GitHub Actions lint/type-check/test workflow |
| Governance | Contributor and branch comparison guide |

## Why This Is a Strong Starting Point

1. **Easy to understand**: no heavy framework lock-in at the beginning.
2. **Easy to test**: core behaviour does not require paid APIs or external services.
3. **Easy to extend**: agents, tools, and workflows are separated.
4. **Safe for contributors**: everyone can create their own `candidate/*` branch.
5. **Future-ready**: MCP, RAG, vector databases, LangGraph, and cloud deployment can be added later.

## Next Steps

- Add async workflow execution.
- Add MCP tool adapter.
- Add document ingestion and retrieval.
- Add evaluation metrics.
- Add FastAPI service wrapper.
- Add Docker/devcontainer support.
