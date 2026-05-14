from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


ToolCallable = Callable[..., Any]


@dataclass(slots=True)
class RegisteredTool:
    """Metadata for a callable tool."""

    name: str
    description: str
    function: ToolCallable


class ToolRegistry:
    """Simple registry for agent tools.

    This keeps tool discovery separate from the agents. Later this can be extended
    to support MCP tools, API connectors, database tools, and permission checks.
    """

    def __init__(self) -> None:
        self._tools: dict[str, RegisteredTool] = {}

    def register(self, name: str, description: str, function: ToolCallable) -> None:
        if name in self._tools:
            raise ValueError(f"Tool already registered: {name}")
        self._tools[name] = RegisteredTool(name=name, description=description, function=function)

    def list_tools(self) -> list[RegisteredTool]:
        return list(self._tools.values())

    def execute(self, name: str, **kwargs: Any) -> Any:
        if name not in self._tools:
            available = ", ".join(sorted(self._tools)) or "none"
            raise KeyError(f"Unknown tool: {name}. Available tools: {available}")
        return self._tools[name].function(**kwargs)
