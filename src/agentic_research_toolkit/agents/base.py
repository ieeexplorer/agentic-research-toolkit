from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class AgentContext:
    """Input context shared with an agent.

    Keep this simple first: the orchestrator can pass task text, memory, metadata,
    and tool handles without forcing every agent to know the whole system.
    """

    task: str
    memory: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class AgentResult:
    """Standard result returned by every agent."""

    output: str
    confidence: float = 0.0
    evidence: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class Agent(ABC):
    """Base interface for all research agents."""

    name: str
    description: str

    def __init__(self, name: str, description: str) -> None:
        self.name = name
        self.description = description

    @abstractmethod
    def run(self, context: AgentContext) -> AgentResult:
        """Execute the agent against a task context."""
