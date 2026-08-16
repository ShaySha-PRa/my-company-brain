variable "MCB_IMAGE_PREFIX" {
  default = "mcb"
}

variable "MCB_IMAGE_TAG" {
  default = "latest"
}

group "default" {
  targets = [
    "web",
    "api",
    "agent-gateway",
    "nano-brain",
    "traditional-rag",
    "graph-rag",
    "neo4j",
    "migrate",
  ]
}

target "web" {
  context    = "../.."
  dockerfile = "deploy/compose/Dockerfile.web"
  target     = "web"
  tags       = ["${MCB_IMAGE_PREFIX}/web:${MCB_IMAGE_TAG}"]
}

target "api" {
  context    = "../.."
  dockerfile = "deploy/compose/Dockerfile.bun-service"
  target     = "api"
  tags       = ["${MCB_IMAGE_PREFIX}/api:${MCB_IMAGE_TAG}"]
}

target "agent-gateway" {
  context    = "../.."
  dockerfile = "deploy/compose/Dockerfile.bun-service"
  target     = "agent-gateway"
  tags       = ["${MCB_IMAGE_PREFIX}/agent-gateway:${MCB_IMAGE_TAG}"]
}

target "nano-brain" {
  context    = "../.."
  dockerfile = "deploy/compose/Dockerfile.bun-service"
  target     = "nano-brain"
  tags       = ["${MCB_IMAGE_PREFIX}/nano-brain:${MCB_IMAGE_TAG}"]
}

target "traditional-rag" {
  context    = "../.."
  dockerfile = "deploy/compose/Dockerfile.python-service"
  target     = "traditional-rag"
  tags       = ["${MCB_IMAGE_PREFIX}/traditional-rag:${MCB_IMAGE_TAG}"]
}

target "graph-rag" {
  context    = "../.."
  dockerfile = "deploy/compose/Dockerfile.python-service"
  target     = "graph-rag"
  tags       = ["${MCB_IMAGE_PREFIX}/graph-rag:${MCB_IMAGE_TAG}"]
}

target "neo4j" {
  context = "../database/neo4j"
  tags    = ["${MCB_IMAGE_PREFIX}/neo4j:${MCB_IMAGE_TAG}"]
}

target "migrate" {
  context    = "../.."
  dockerfile = "deploy/database/Dockerfile.migrate"
  tags       = ["${MCB_IMAGE_PREFIX}/migrate:${MCB_IMAGE_TAG}"]
}
