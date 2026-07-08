import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { executionEventBus } from "@/lib/execution-events";

const MOCK_OUTPUTS: Record<string, string> = {
  research: `## Research Findings\n\nBased on comprehensive analysis of the available literature and data sources:\n\n1. **Key Insight**: The primary research question can be addressed through a multi-phase approach combining qualitative and quantitative methods.\n\n2. **Supporting Evidence**: Multiple peer-reviewed studies (n=47) confirm the statistical significance of the observed patterns (p < 0.001).\n\n3. **Gap Analysis**: Current literature lacks longitudinal studies examining the interaction effects between variables A and B over extended time periods.\n\n4. **Recommendation**: Future research should prioritize controlled experimental designs with larger sample sizes to validate preliminary findings.`,
  planning: `## Execution Plan\n\n### Phase 1: Foundation (Week 1-2)\n- Define research scope and boundaries\n- Identify key stakeholders and data sources\n- Establish evaluation criteria and success metrics\n\n### Phase 2: Data Collection (Week 3-4)\n- Implement automated data pipeline\n- Conduct structured interviews with domain experts\n- Gather baseline measurements\n\n### Phase 3: Analysis (Week 5-6)\n- Apply statistical analysis framework\n- Cross-validate findings across data sources\n- Generate preliminary insights\n\n### Phase 4: Synthesis (Week 7-8)\n- Compile comprehensive findings report\n- Develop actionable recommendations\n- Present results to stakeholders`,
  retrieval: `## Retrieved Results\n\nFound 12 relevant documents matching the query:\n\n1. **"Advances in Agentic Systems"** (2024) - Relevance: 95%\n   Comprehensive survey of autonomous agent architectures\n\n2. **"Tool-Use in LLM Agents"** (2024) - Relevance: 89%\n   Analysis of function calling patterns and optimization strategies\n\n3. **"Multi-Agent Coordination"** (2023) - Relevance: 85%\n   Framework for orchestrating multiple specialized agents\n\nSources: arXiv, Semantic Scholar, PubMed`,
  writing: `## Draft Report\n\n### Executive Summary\n\nThis report presents findings from an extensive investigation into agentic research methodologies. Our analysis reveals significant opportunities for improving research workflow efficiency through modular agent architectures.\n\n### Introduction\n\nThe field of AI-assisted research has undergone rapid transformation in recent years. Agentic systems now demonstrate capabilities that were previously thought to require human-level reasoning, particularly in domains involving complex information synthesis.\n\n### Methodology\n\nOur approach combines systematic literature review with empirical evaluation of existing agent frameworks, using a standardized benchmarking protocol across five key dimensions.\n\n### Results\n\nPreliminary results indicate a 34% improvement in research throughput when using orchestrated multi-agent systems compared to single-agent approaches.`,
  evaluation: `## Evaluation Report\n\n### Overall Assessment: 8.2/10\n\n**Strengths:**\n- Well-structured methodology with clear hypotheses\n- Robust data collection procedures\n- Appropriate statistical techniques applied\n\n**Areas for Improvement:**\n- Sample size could be increased for stronger statistical power\n- Consider adding qualitative validation\n- Document limitations more explicitly\n\n**Recommendations:**\n1. Expand dataset to include international sources\n2. Implement cross-validation procedures\n3. Add sensitivity analysis for key parameters`,
  custom: `## Agent Output\n\nProcessing complete. The analysis has identified three primary clusters in the data with distinct characteristics. Confidence level: 87.3%. Further investigation recommended for cluster 2 outliers.`,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const execution = await db.agentExecution.create({
      data: {
        agentId: id,
        input: body.input || "Default query execution",
        status: "running",
      },
    });

    // Emit agent_start event
    executionEventBus.emit({
      type: "agent_start",
      id: execution.id,
      name: agent.name,
      status: "running",
      progress: 0,
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Emit agent_progress event
    executionEventBus.emit({
      type: "agent_progress",
      id: execution.id,
      name: agent.name,
      status: "running",
      progress: 50,
      timestamp: new Date().toISOString(),
    });

    const output =
      MOCK_OUTPUTS[agent.type] || MOCK_OUTPUTS.custom;

    const updated = await db.agentExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        output,
        duration: 1200 + Math.floor(Math.random() * 800),
        tokensUsed: 300 + Math.floor(Math.random() * 200),
      },
    });

    // Emit agent_complete event
    executionEventBus.emit({
      type: "agent_complete",
      id: execution.id,
      name: agent.name,
      status: "completed",
      progress: 100,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(updated, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to execute agent" },
      { status: 500 }
    );
  }
}