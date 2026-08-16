from fastapi import FastAPI
from fastapi import Header, HTTPException
import hmac
import os

from .db import ensure_default_source
from .models import HealthResponse


def create_app(database_url: str | None = None, internal_token: str | None = None) -> FastAPI:
    app = FastAPI(title="My Company Brain Traditional RAG", version="0.1.0")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse()

    @app.post("/internal/users/default-source")
    def default_source(
        x_mcb_internal_token: str | None = Header(default=None),
        x_mcb_user_id: str | None = Header(default=None),
        x_mcb_username: str | None = Header(default=None),
        x_mcb_is_admin: str | None = Header(default=None),
    ) -> dict[str, object]:
        expected = internal_token or os.environ.get("MCB_INTERNAL_TOKEN")
        if not expected or not x_mcb_internal_token or not hmac.compare_digest(x_mcb_internal_token, expected):
            raise HTTPException(status_code=401, detail="internal authentication required")
        if not x_mcb_user_id or not x_mcb_username or x_mcb_is_admin not in {"true", "false"}:
            raise HTTPException(status_code=401, detail="internal authentication required")
        try:
            return {"source": ensure_default_source(x_mcb_user_id, x_mcb_username, database_url)}
        except Exception as error:
            raise HTTPException(status_code=503, detail="module storage unavailable") from error

    return app
