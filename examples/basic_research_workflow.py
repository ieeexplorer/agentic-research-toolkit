from agentic_research_toolkit.agents.researcher import ResearcherAgent
from agentic_research_toolkit.orchestration.workflow import ResearchWorkflow


workflow = ResearchWorkflow()
workflow.add_agent(ResearcherAgent())

result = workflow.run("Compare different RAG evaluation methods for academic research agents")

print(result.final_output)
