import asyncio
import json
from pathlib import Path

import httpx
import pytest

from mcb_graph_rag.app import create_app
from mcb_graph_rag.settings import parse_port


def expected_health() -> dict[str, object]:
    fixture_path = (
        Path(__file__).resolve().parents[3]
        / "tests"
        / "contract"
        / "fixtures"
        / "health-response.json"
    )
    responses = json.loads(fixture_path.read_text())
    return next(item for item in responses if item["service"] == "graph-rag")


def test_health_matches_cross_language_contract() -> None:
    async def request_health() -> httpx.Response:
        transport = httpx.ASGITransport(app=create_app())
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            return await client.get("/health")

    response = asyncio.run(request_health())
    assert response.status_code == 200
    assert response.json() == expected_health()


@pytest.mark.parametrize("value", ["", "0", "65536", "2.5", "bad"])
def test_invalid_port_is_rejected(value: str) -> None:
    with pytest.raises(ValueError, match="MCB_GRAPH_PORT"):
        parse_port(value)
