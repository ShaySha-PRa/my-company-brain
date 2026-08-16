from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["graph-rag"] = "graph-rag"
    version: str = "0.1.0"
