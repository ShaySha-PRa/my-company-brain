DEFAULT_PORT = 8102


def parse_port(value: str | None) -> int:
    if value is None:
        return DEFAULT_PORT
    try:
        port = int(value)
    except ValueError as error:
        raise ValueError(
            "MCB_GRAPH_PORT must be an integer between 1 and 65535"
        ) from error
    if str(port) != value or not 1 <= port <= 65_535:
        raise ValueError("MCB_GRAPH_PORT must be an integer between 1 and 65535")
    return port
