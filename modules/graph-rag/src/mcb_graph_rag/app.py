from fastapi import FastAPI

from .models import HealthResponse


def create_app() -> FastAPI:
    app = FastAPI(title="My Company Brain GraphRAG", version="0.1.0")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse()

    return app
