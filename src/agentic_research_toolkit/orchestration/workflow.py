from __future__ import annotations

from dataclasses import dataclass, field

from agentic_research_toolkit.agents.base import Agent, AgentContext, AgentResult


@dataclass(slots=True)
class WorkflowStepResult:
    """Result for one agent step inside a workflow."""

    agent_name: str
    result: AgentResult


@dataclass(slots=True)
class WorkflowResult:
    """Final workflow result with all intermediate steps."""

    final_output: str
    steps: list[WorkflowStepResult] = field(default_factory=list)


class ResearchWorkflow:
    """Minimal sequential workflow for research agents.

    This is intentionally simple for the first candidate branch. Later branches can
    replace it with a DAG, LangGraph, async execution, or multi-agent debate.
    """

    def __init__(self) -> None:
        self._agents: list[Agent] = []

    def add_agent(self, agent: Agent) -> None:
        self._agents.append(agent)

    def run(self, task: str) -> WorkflowResult:
        if not self._agents:
            raise ValueError("Workflow has no agents. Add at least one agent before running.")

        context = AgentContext(task=task)
        steps: list[WorkflowStepResult] = []

        for agent in self._agents:
            result = agent.run(context)
            steps.append(WorkflowStepResult(agent_name=agent.name, result=result))
            context.memory[agent.name] = result.output

        return WorkflowResult(final_output=steps[-1].result.output, steps=steps)
