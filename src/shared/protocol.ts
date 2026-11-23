/**
 * Messages exchanged over a session WebSocket. Shared by the client and the
 * Worker so both sides agree on the shape.
 */

/** What the group is singing right now. */
export interface NowSinging {
  songId: string;
  /** Index of the active stanza, or null for "this song, not started yet". */
  stanza: number | null;
}

export type ClientMessage =
  /** Set what's being sung (or clear it with null). */
  | { type: "set"; now: NowSinging | null }
  | { type: "ping" };

export type ServerMessage =
  | { type: "state"; now: NowSinging | null; by: string | null }
  | { type: "presence"; count: number }
  | { type: "welcome"; you: string }
  | { type: "pong" };

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

export function isValidCode(code: string): boolean {
  return /^[a-z0-9]{4,16}$/.test(code);
}

export function newCode(length = 5): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export function parseNowSinging(value: unknown): NowSinging | null | undefined {
  if (value === null) return null;
  if (typeof value !== "object") return undefined;
  const { songId, stanza } = value as Record<string, unknown>;
  if (typeof songId !== "string" || !/^[a-z0-9-]{1,100}$/.test(songId)) return undefined;
  if (stanza !== null && !(Number.isInteger(stanza) && (stanza as number) >= 0 && (stanza as number) < 1000)) {
    return undefined;
  }
  return { songId, stanza: stanza as number | null };
}
