import { INTERNAL_HEADERS } from "@mcb/contracts";
import type { IdentityUser } from "@mcb/identity";

export function buildTrustedInternalHeaders(user: IdentityUser, internalToken: string, contentType?: string): Headers {
  const headers = new Headers();
  headers.set("x-mcb-internal-token", internalToken);
  headers.set("x-mcb-user-id", user.id);
  headers.set("x-mcb-username", user.username);
  headers.set("x-mcb-is-admin", String(user.isAdmin));
  if (contentType) headers.set("content-type", contentType);
  return headers;
}

export function removeClientInternalHeaders(source: Headers): Headers {
  const output = new Headers(source);
  for (const header of source.keys()) if (header.toLowerCase().startsWith("x-mcb-")) output.delete(header);
  return output;
}

export function onlyTrustedInternalHeaders(headers: Headers): string[] {
  return [...headers.keys()].filter((header) => (INTERNAL_HEADERS as readonly string[]).includes(header.toLowerCase()));
}
