import { DurableObject } from "cloudflare:workers";
import { parseNowSinging, type ClientMessage, type NowSinging, type ServerMessage } from "../shared/protocol";

/** Forget a session after this long with nobody connected. */
const IDLE_MS = 7 * 24 * 60 * 60 * 1000;

interface Attachment {
  id: string;
}

/**
 * One singing session: a handful of people sharing "now singing" (song + verse).
 * Uses the WebSocket Hibernation API so idle sessions cost nothing.
 */
export class Session extends DurableObject<Env> {
  async fetch(_request: Request): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    const id = crypto.randomUUID();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id } satisfies Attachment);

    send(server, { type: "welcome", you: id });
    send(server, {
      type: "state",
      now: (await this.ctx.storage.get<NowSinging | null>("now")) ?? null,
      by: (await this.ctx.storage.get<string | null>("by")) ?? null,
    });
    this.broadcastPresence();
    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }
    if (msg.type === "ping") {
      send(ws, { type: "pong" });
    } else if (msg.type === "set") {
      const now = parseNowSinging(msg.now);
      if (now === undefined) return;
      const by = (ws.deserializeAttachment() as Attachment).id;
      await this.ctx.storage.put({ now, by });
      this.broadcast({ type: "state", now, by });
      await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 ? 1000 : code);
    } catch {
      // already closed
    }
    this.broadcastPresence(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.broadcastPresence(ws);
  }

  async alarm() {
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
    } else {
      await this.ctx.storage.deleteAll();
    }
  }

  private broadcastPresence(leaving?: WebSocket) {
    const count = this.sockets(leaving).length;
    this.broadcast({ type: "presence", count }, leaving);
  }

  private sockets(except?: WebSocket): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private broadcast(msg: ServerMessage, except?: WebSocket) {
    for (const ws of this.sockets(except)) send(ws, msg);
  }
}

function send(ws: WebSocket, msg: ServerMessage) {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // Socket went away; presence will be updated on close.
  }
}
