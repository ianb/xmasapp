import { Session } from "./session";
import { isValidCode } from "../shared/protocol";

export { Session };

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true });
    }
    const m = /^\/api\/sessions\/([^/]+)\/ws$/.exec(url.pathname);
    if (m) {
      const code = m[1].toLowerCase();
      if (!isValidCode(code)) {
        return new Response("Bad session code", { status: 400 });
      }
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected a WebSocket upgrade", { status: 426 });
      }
      return env.SESSIONS.getByName(code).fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
