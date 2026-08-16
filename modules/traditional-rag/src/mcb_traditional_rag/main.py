import os

import uvicorn

from .app import create_app
from .settings import parse_port


def run() -> None:
    port = parse_port(os.environ.get("MCB_TRADITIONAL_PORT"))
    uvicorn.run(create_app(), host="127.0.0.1", port=port)


if __name__ == "__main__":
    run()
