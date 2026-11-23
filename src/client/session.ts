import type { ClientMessage, NowSinging, ServerMessage } from "../shared/protocol";

export type Status = "connecting" | "open" | "closed";

export interface SessionEvents {
  /** "Now singing" changed. `mine` is true if this client made the change. */
  state(now: NowSinging | null, mine: boolean): void;
  presence(count: number): void;
  status(status: Status): void;
}

/** A WebSocket connection to a shared session that reconnects automatically. */
export class SessionConnection {
  now: NowSinging | null = null;
  count = 0;
  status: Status = "connecting";

  private ws: WebSocket | null = null;
  private me: string | null = null;
  private retry = 0;
  private closed = false;
  private pingTimer: number | undefined;
  private retryTimer: number | undefined;

  readonly code: string;
  private events: SessionEvents;

  constructor(code: string, events: SessionEvents) {
    this.code = code;
    this.events = events;
    this.connect();
    document.addEventListener("visibilitychange", this.onVisible);
  }

  set(now: NowSinging | null) {
    // Apply locally right away; the server echoes it back to everyone.
    this.now = now;
    this.send({ type: "set", now });
  }

  close() {
    this.closed = true;
    document.removeEventListener("visibilitychange", this.onVisible);
    clearInterval(this.pingTimer);
    clearTimeout(this.retryTimer);
    this.ws?.close();
  }

  private connect() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/api/sessions/${this.code}/ws`);
    this.ws = ws;
    this.setStatus("connecting");

    ws.addEventListener("open", () => {
      this.retry = 0;
      this.setStatus("open");
      clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => this.send({ type: "ping" }), 30_000);
    });

    ws.addEventListener("message", (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case "welcome":
          this.me = msg.you;
          break;
        case "state":
          this.now = msg.now;
          this.events.state(msg.now, msg.by !== null && msg.by === this.me);
          break;
        case "presence":
          this.count = msg.count;
          this.events.presence(msg.count);
          break;
      }
    });

    ws.addEventListener("close", () => {
      if (this.ws !== ws) return;
      clearInterval(this.pingTimer);
      this.ws = null;
      if (this.closed) return;
      this.setStatus("closed");
      const delay = Math.min(30_000, 500 * 2 ** this.retry++);
      this.retryTimer = window.setTimeout(() => this.connect(), delay);
    });
  }

  /** Phones drop sockets while asleep; reconnect promptly when we come back. */
  private onVisible = () => {
    if (document.visibilityState === "visible" && !this.ws && !this.closed) {
      clearTimeout(this.retryTimer);
      this.retry = 0;
      this.connect();
    }
  };

  private send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private setStatus(status: Status) {
    this.status = status;
    this.events.status(status);
  }
}
