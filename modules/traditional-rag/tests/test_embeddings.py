from __future__ import annotations

import json
import math

import pytest

from traditional_rag.core.embeddings import embed_texts
from traditional_rag.core.errors import TraditionalRagError


class _Response:
    def __init__(self, payload: dict):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode()


def _vector(first: float, second: float) -> list[float]:
    return [first, second, *([0.0] * 1534)]


def test_minimax_native_embedding_preserves_order_and_normalizes(monkeypatch):
    monkeypatch.setenv("EMBEDDING_PROVIDER", "minimax-native")
    monkeypatch.setenv("EMBEDDING_BASE_URL", "https://embedding.example/v1")
    monkeypatch.setenv("EMBEDDING_API_KEY", "secret")
    monkeypatch.setenv("EMBEDDING_MODEL", "embo-01")
    requests: list[dict] = []

    def fake_urlopen(request, timeout):
        requests.append(json.loads(request.data))
        return _Response({"vectors": [_vector(3, 4), _vector(5, 12)], "base_resp": {"status_code": 0}})

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    vectors, model, dimensions = embed_texts(["first", "second"], input_type="query")

    assert requests == [{"model": "embo-01", "texts": ["first", "second"], "type": "query"}]
    assert model == "embo-01"
    assert dimensions == 1024
    assert vectors[0][:2] == pytest.approx([0.6, 0.8])
    assert vectors[1][:2] == pytest.approx([5 / 13, 12 / 13])
    assert math.sqrt(sum(value * value for value in vectors[0])) == pytest.approx(1.0)


def test_minimax_native_embedding_requires_success_status(monkeypatch):
    monkeypatch.setenv("EMBEDDING_PROVIDER", "minimax-native")
    monkeypatch.setenv("EMBEDDING_BASE_URL", "https://embedding.example/v1")
    monkeypatch.setenv("EMBEDDING_API_KEY", "secret")
    monkeypatch.setenv("EMBEDDING_MODEL", "embo-01")
    monkeypatch.setattr(
        "urllib.request.urlopen",
        lambda request, timeout: _Response({"vectors": [_vector(1, 0)], "base_resp": {"status_code": 1001}}),
    )

    with pytest.raises(TraditionalRagError, match="失败状态"):
        embed_texts(["input"])
