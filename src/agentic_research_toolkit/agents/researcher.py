from __future__ import annotations

from agentic_research_toolkit.agents.base import Agent, AgentContext, AgentResult


class ResearcherAgent(Agent):
    """Baseline research agent.

    This starter version does not call external LLMs. It creates a structured research
    plan so the repo stays testable and safe from day one.
    """

    def __init__(self) -> None:
        super().__init__(
            name="researcher",
            description="Breaks a research task into questions, sources, and deliverables.",
        )

    def run(self, context: AgentContext) -> AgentResult:
        task = context.task.strip()
        if not task:
            return AgentResult(output="No task provided.", confidence=0.0)

        plan = "\n".join(
            [
                f"Research task: {task}",
                "",
                "1. Clarify the exact research question.",
                "2. Identify reliable source types.",
                "3. Extract claims, evidence, and uncertainty.",
                "4. Compare sources for agreement or conflict.",
                "5. Produce a final answer with citations and limitations.",
            ]
        )
        return AgentResult(output=plan, confidence=0.7, metadata={"agent": self.name})
