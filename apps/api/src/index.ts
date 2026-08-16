import { startApiServer } from "./server.ts";

if (import.meta.main) {
  const server = startApiServer();
  console.log(`My Company Brain API listening on ${server.port}`);
}
