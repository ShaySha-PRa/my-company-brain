from __future__ import annotations

import json
import math
import asyncio

import numpy as np
import pytest

from graph_rag.core import lightrag_service


class _Response:
    def __init__(self, payload: dict):
        self.payload = payload

    def read(self):
        return json.dumps(self.payload).encode()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


def _vector(first: float, second: float) -> list[float]:
    return [first, second, *([0.0] * 1534)]


def test_lightrag_embedding_uses_native_query_payload_and_numpy(monkeypatch):
    monkeypatch.setenv("EMBEDDING_PROVIDER", "minimax-native")
    monkeypatch.setenv("EMBEDDING_BASE_URL", "https://embedding.example/v1")
    monkeypatch.setenv("EMBEDDING_API_KEY", "secret")
    monkeypatch.setenv("EMBEDDING_MODEL", "embo-01")
    requests: list[dict] = []

    def fake_urlopen(request, timeout):
        requests.append(json.loads(request.data))
        return _Response({"vectors": [_vector(3, 4)], "base_resp": {"status_code": 0}})

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    result = asyncio.run(lightrag_service._embedding_func(["question"], context="query"))

    assert isinstance(result, np.ndarray)
    assert result.shape == (1, 1024)
    assert result[0, :2].tolist() == pytest.approx([0.6, 0.8])
    assert math.sqrt(float(np.sum(result[0] ** 2))) == pytest.approx(1.0)
    assert requests == [{"model": "embo-01", "texts": ["question"], "type": "query"}]
