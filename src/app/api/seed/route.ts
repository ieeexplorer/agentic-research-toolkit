import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await db.workflowConnection.deleteMany();
    await db.workflowNode.deleteMany();
    await db.workflowExecution.deleteMany();
    await db.agentExecution.deleteMany();
    await db.toolExecution.deleteMany();
    await db.evaluation.deleteMany();
    await db.memory.deleteMany();
    await db.workflow.deleteMany();
    await db.tool.deleteMany();
    await db.agent.deleteMany();

    const researchAgent = await db.agent.create({
      data: {
        name: "Research Analyst",
        description: "Specialized in comprehensive literature review and data analysis across academic and industry sources.",
        type: "research",
        systemPrompt: "You are a senior research analyst. Conduct thorough analysis, cite sources, and provide evidence-based findings.",
        model: "gpt-4o",
        temperature: 0.3,
        maxTokens: 8192,
        status: "active",
      },
    });
    const planningAgent = await db.agent.create({
      data: {
        name: "Project Planner",
        description: "Creates detailed project plans with timelines, milestones, and resource allocation strategies.",
        type: "planning",
        systemPrompt: "You are a project planning expert. Break down complex projects into manageable phases.",
        model: "gpt-4o",
        temperature: 0.5,
        maxTokens: 4096,
        status: "active",
      },
    });
    const retrievalAgent = await db.agent.create({
      data: {
        name: "Document Retriever",
        description: "Performs semantic search across document collections to find relevant information.",
        type: "retrieval",
        systemPrompt: "You are a document retrieval specialist. Find and rank the most relevant documents.",
        model: "gpt-4o-mini",
        temperature: 0.1,
        maxTokens: 4096,
        status: "active",
      },
    });
    const writingAgent = await db.agent.create({
      data: {
        name: "Technical Writer",
        description: "Produces clear, well-structured technical reports, papers, and documentation.",
        type: "writing",
        systemPrompt: "You are a technical writer. Produce professional content with proper formatting.",
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 8192,
        status: "active",
      },
    });
    const evalAgent = await db.agent.create({
      data: {
        name: "Quality Evaluator",
        description: "Evaluates agent outputs against predefined quality criteria.",
        type: "evaluation",
        systemPrompt: "You are a quality evaluator. Assess outputs and provide constructive feedback.",
        model: "gpt-4o",
        temperature: 0.2,
        maxTokens: 4096,
        status: "active",
      },
    });
    const customAgent = await db.agent.create({
      data: {
        name: "Data Synthesizer",
        description: "Custom agent for synthesizing data from multiple sources into unified formats.",
        type: "custom",
        systemPrompt: "Synthesize data from multiple sources into a coherent output.",
        model: "claude-3.5-sonnet",
        temperature: 0.4,
        maxTokens: 6144,
        status: "draft",
      },
    });

    const webSearch = await db.tool.create({
      data: {
        name: "Web Search",
        description: "Search the web for relevant information using multiple search engines.",
        type: "search",
        endpoint: "https://api.search.example.com/v1/query",
        config: JSON.stringify({ engines: ["google", "bing"], maxResults: 10 }),
        status: "active",
      },
    });
    const arxivTool = await db.tool.create({
      data: {
        name: "arXiv Paper Fetcher",
        description: "Fetch and parse academic papers from the arXiv preprint server.",
        type: "api",
        endpoint: "https://export.arxiv.org/api/query",
        config: JSON.stringify({ categories: ["cs.AI", "cs.CL"], maxPapers: 20 }),
        status: "active",
      },
    });
    const docProcessor = await db.tool.create({
      data: {
        name: "Document Processor",
        description: "Extract text, tables, and metadata from PDF, DOCX, and other formats.",
        type: "document",
        endpoint: "internal://document-processor",
        config: JSON.stringify({ supportedFormats: ["pdf", "docx", "txt"], ocrEnabled: true }),
        status: "active",
      },
    });
    const sqlQuery = await db.tool.create({
      data: {
        name: "SQL Query Runner",
        description: "Execute read-only SQL queries against research databases.",
        type: "database",
        endpoint: "internal://sql-runner",
        config: JSON.stringify({ databases: ["research_db", "papers_db"], readOnly: true }),
        status: "active",
      },
    });
    const mcpServer = await db.tool.create({
      data: {
        name: "MCP Research Server",
        description: "MCP server providing research-specific tools and resources.",
        type: "mcp",
        endpoint: "mcp://research-server.local",
        config: JSON.stringify({ tools: ["literature_search", "citation_manager"] }),
        status: "active",
      },
    });
    const pythonExec = await db.tool.create({
      data: {
        name: "Python Sandbox",
        description: "Execute Python code in an isolated sandbox for data analysis.",
        type: "local",
        endpoint: "internal://python-sandbox",
        config: JSON.stringify({ timeout: 60, memoryLimit: "512MB" }),
        status: "draft",
      },
    });

    const workflow = await db.workflow.create({
      data: {
        name: "Research Pipeline",
        description: "End-to-end: retrieve, analyze, write, evaluate.",
        status: "active",
      },
    });
    const n1 = await db.workflowNode.create({ data: { workflowId: workflow.id, name: "Retrieve", nodeType: "tool", toolId: webSearch.id, positionX: 80, positionY: 120 } });
    const n2 = await db.workflowNode.create({ data: { workflowId: workflow.id, name: "Analyze", nodeType: "agent", agentId: researchAgent.id, positionX: 300, positionY: 120 } });
    const n3 = await db.workflowNode.create({ data: { workflowId: workflow.id, name: "Plan", nodeType: "agent", agentId: planningAgent.id, positionX: 520, positionY: 60 } });
    const n4 = await db.workflowNode.create({ data: { workflowId: workflow.id, name: "Write", nodeType: "agent", agentId: writingAgent.id, positionX: 520, positionY: 180 } });
    const n5 = await db.workflowNode.create({ data: { workflowId: workflow.id, name: "Evaluate", nodeType: "agent", agentId: evalAgent.id, positionX: 740, positionY: 120 } });
    await db.workflowConnection.createMany({
      data: [
        { workflowId: workflow.id, sourceNodeId: n1.id, targetNodeId: n2.id, label: "docs" },
        { workflowId: workflow.id, sourceNodeId: n2.id, targetNodeId: n3.id, label: "analysis" },
        { workflowId: workflow.id, sourceNodeId: n2.id, targetNodeId: n4.id, label: "data" },
        { workflowId: workflow.id, sourceNodeId: n3.id, targetNodeId: n5.id, label: "plan" },
        { workflowId: workflow.id, sourceNodeId: n4.id, targetNodeId: n5.id, label: "draft" },
      ],
    });

    const workflow2 = await db.workflow.create({
      data: { name: "Quick Literature Review", description: "Rapid literature search and summary generation.", status: "active" },
    });
    const w2n1 = await db.workflowNode.create({ data: { workflowId: workflow2.id, name: "Search arXiv", nodeType: "tool", toolId: arxivTool.id, positionX: 80, positionY: 120 } });
    const w2n2 = await db.workflowNode.create({ data: { workflowId: workflow2.id, name: "Retrieve", nodeType: "agent", agentId: retrievalAgent.id, positionX: 300, positionY: 120 } });
    const w2n3 = await db.workflowNode.create({ data: { workflowId: workflow2.id, name: "Summarize", nodeType: "agent", agentId: writingAgent.id, positionX: 520, positionY: 120 } });
    await db.workflowConnection.createMany({
      data: [
        { workflowId: workflow2.id, sourceNodeId: w2n1.id, targetNodeId: w2n2.id },
        { workflowId: workflow2.id, sourceNodeId: w2n2.id, targetNodeId: w2n3.id },
      ],
    });

    const now = Date.now();
    await db.memory.createMany({
      data: [
        { key: "research_context", value: "Investigating multi-agent coordination strategies for research automation.", type: "long_term", tags: JSON.stringify(["research", "context"]) },
        { key: "preferred_models", value: JSON.stringify({ primary: "gpt-4o", fast: "gpt-4o-mini" }), type: "long_term", tags: JSON.stringify(["config", "models"]) },
        { key: "last_search_query", value: "agentic research toolkit evaluation methods 2024", type: "short_term", tags: JSON.stringify(["search", "recent"]) },
        { key: "session_notes", value: "Discussed improvements to evaluation pipeline. Consider human-in-the-loop validation.", type: "session", tags: JSON.stringify(["notes"]) },
        { key: "citation_style", value: "APA 7th edition with DOI links.", type: "long_term", tags: JSON.stringify(["writing"]) },
        { key: "tool_prefs", value: JSON.stringify({ search: "web_search", papers: "arxiv" }), type: "short_term", tags: JSON.stringify(["tools"]) },
      ],
    });

    await db.evaluation.createMany({
      data: [
        { name: "Research Quality Assessment", type: "quality", metric: "score", agentId: researchAgent.id, config: JSON.stringify({ criteria: ["accuracy", "completeness", "relevance"] }), results: JSON.stringify([{ criterion: "accuracy", score: 8.5, passed: true }, { criterion: "completeness", score: 7.8, passed: true }, { criterion: "relevance", score: 9.1, passed: true }]), avgScore: 8.47 },
        { name: "Writing Coherence Check", type: "coherence", metric: "score", agentId: writingAgent.id, config: JSON.stringify({ criteria: ["grammar", "structure", "clarity"] }), results: JSON.stringify([{ criterion: "grammar", score: 9.2, passed: true }, { criterion: "structure", score: 8.7, passed: true }, { criterion: "clarity", score: 8.9, passed: true }]), avgScore: 8.93 },
        { name: "Retrieval Relevance Test", type: "relevance", metric: "pass_fail", config: JSON.stringify({ threshold: 0.7 }), results: JSON.stringify([{ query: "test 1", relevance: 0.92, passed: true }, { query: "test 2", relevance: 0.85, passed: true }]), avgScore: 0.89 },
        { name: "Pipeline E2E Test", type: "quality", metric: "score", workflowId: workflow.id, config: JSON.stringify({ criteria: ["completion", "quality", "time"] }), results: "[]", avgScore: 0 },
      ],
    });

    await db.agentExecution.createMany({
      data: [
        { agentId: researchAgent.id, input: "Analyze recent trends in agentic AI systems", output: "Key trends: 1) Multi-agent orchestration, 2) Tool-use optimization, 3) Memory-augmented reasoning", status: "completed", duration: 1450, tokensUsed: 420, createdAt: new Date(now - 86400000 * 2) },
        { agentId: planningAgent.id, input: "Create research plan for LLM evaluation", output: "Phase 1: Literature review (2 weeks)\nPhase 2: Benchmark dev (3 weeks)\nPhase 3: Evaluation (4 weeks)", status: "completed", duration: 980, tokensUsed: 350, createdAt: new Date(now - 86400000 * 1.5) },
        { agentId: writingAgent.id, input: "Write executive summary", output: "This report synthesizes findings from 47 studies on AI agent architectures...", status: "completed", duration: 2100, tokensUsed: 580, createdAt: new Date(now - 86400000) },
        { agentId: evalAgent.id, input: "Evaluate output quality", output: "Overall: 8.35/10. Strengths: methodology. Improve: sample size.", status: "completed", duration: 760, tokensUsed: 280, createdAt: new Date(now - 3600000 * 5) },
        { agentId: retrievalAgent.id, input: "Find papers on coordination", output: "12 documents found. Top: 'Multi-Agent Coordination Frameworks' (95% match)", status: "completed", duration: 620, tokensUsed: 190, createdAt: new Date(now - 3600000 * 2) },
      ],
    });

    await db.toolExecution.createMany({
      data: [
        { toolId: webSearch.id, input: "agentic AI research 2024", output: "23 results found. Top: 'Agentic AI Survey' (96.2% relevance)", status: "completed", duration: 850, createdAt: new Date(now - 86400000 * 2) },
        { toolId: arxivTool.id, input: "multi-agent systems cs.AI", output: "15 papers retrieved from arXiv.", status: "completed", duration: 1200, createdAt: new Date(now - 86400000) },
        { toolId: docProcessor.id, input: "research_paper.pdf", output: "24 pages, 8 sections, 156 entities extracted.", status: "completed", duration: 3400, createdAt: new Date(now - 3600000 * 8) },
      ],
    });

    await db.workflowExecution.createMany({
      data: [
        { workflowId: workflow.id, input: "Research topic: agentic systems", output: "Completed. 5 nodes, all successful. 3.2s total.", status: "completed", duration: 3200, nodeResults: JSON.stringify([{ nodeId: n1.id, name: "Retrieve", status: "completed", duration: 800 }, { nodeId: n2.id, name: "Analyze", status: "completed", duration: 1200 }]), createdAt: new Date(now - 86400000) },
        { workflowId: workflow2.id, input: "Literature review: RAG systems", output: "Completed. 3 nodes. Summary generated.", status: "completed", duration: 1800, nodeResults: "[]", createdAt: new Date(now - 3600000 * 4) },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}