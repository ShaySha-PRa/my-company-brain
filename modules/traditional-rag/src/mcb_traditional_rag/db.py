from __future__ import annotations

import hashlib
import os
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import psycopg


def database_url(value: str | None = None) -> str:
    resolved = value or os.environ.get("MCB_TRADITIONAL_DATABASE_URL") or os.environ.get("TRADITIONAL_DATABASE_URL")
    if not resolved:
        raise RuntimeError("MCB_TRADITIONAL_DATABASE_URL is required")
    return resolved


@contextmanager
def connection(value: str | None = None) -> Iterator[psycopg.Connection[Any]]:
    with psycopg.connect(database_url(value)) as conn:
        yield conn


def ensure_default_source(user_id: str, username: str, value: str | None = None) -> dict[str, object]:
    source_id = "traditional-default-" + hashlib.sha256(user_id.encode()).hexdigest()[:24]
    with connection(value) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO traditional_sources
                  (id, name, description, kind, owner_user_id, visibility_kind, is_default)
                VALUES (%s, %s, %s, 'private', %s, 'private', true)
                ON CONFLICT DO NOTHING
                """,
                (source_id, f"{username} 的文档知识", "成员的默认私有文档知识", user_id),
            )
            cursor.execute(
                """
                SELECT id, name, owner_user_id, is_default
                FROM traditional_sources
                WHERE owner_user_id = %s AND is_default AND active
                """,
                (user_id,),
            )
            row = cursor.fetchone()
        if row is None:
            raise RuntimeError("default source could not be loaded")
    return {"id": row[0], "name": row[1], "ownerUserId": row[2], "isDefault": row[3]}
