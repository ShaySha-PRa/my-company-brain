import { makeHealthResponse } from "@mcb/contracts";

export function GET(): Response {
  return Response.json(makeHealthResponse("web", "0.1.0"));
}
