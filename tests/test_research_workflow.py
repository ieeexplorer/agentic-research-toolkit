from agentic_research_toolkit.agents.researcher import ResearcherAgent
from agentic_research_toolkit.orchestration.workflow import ResearchWorkflow
from agentic_research_toolkit.tools.registry import ToolRegistry


def test_researcher_agent_returns_structured_plan() -> None:
    agent = ResearcherAgent()
    result = agent.run(context=type("Context", (), {"task": "test task"})())

    assert "Research task: test task" in result.output
    assert result.confidence > 0


def test_research_workflow_runs_agent() -> None:
    workflow = ResearchWorkflow()
    workflow.add_agent(ResearcherAgent())

    result = workflow.run("Investigate agent evaluation")

    assert len(result.steps) == 1
    assert result.steps[0].agent_name == "researcher"
    assert "Investigate agent evaluation" in result.final_output


def test_tool_registry_registers_and_executes_tool() -> None:
    registry = ToolRegistry()
    registry.register("double", "Double a number", lambda value: value * 2)

    assert registry.execute("double", value=4) == 8
    assert registry.list_tools()[0].name == "double"
